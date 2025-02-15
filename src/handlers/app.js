const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppMetadata = require('../models/appMetadata');
const Credential = require('../models/credential');
const { validateLoginData, validateBasicAuth } = require('../util/validators');

// Use this route when creating new credentials
// Only email and (unencrypted) password are required in the req body
exports.register = async (req, res) => {
  try {
    const { admin, email, password, viewOnly } = req.body;
    const encryptedPassword = await bcrypt.hash(password, 10);

    const credential = await Credential.create({
      admin,
      email: email.toLowerCase(),
      password: encryptedPassword,
      viewOnly
    });

    const token = jwt.sign(
      { credentialId: credential._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: '1h'
      }
    );

    credential.token = token;
    await credential.save();

    return res.status(201).json(credential);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: err.message });
  }
};

// Log in
exports.login = async (req, res) => {
  try {
    const inputCred = validateBasicAuth(req.headers.authorization);
    if (inputCred.basicAuthError) return res.status(400).send({ general: 'Basic auth form not provided.' });

    const { valid, errors } = validateLoginData(inputCred);
    if (!valid) return res.status(400).json(errors);

    const credential = await Credential.findOne({ email: inputCred.email });
    const isEqual = await bcrypt.compare(inputCred.password, credential.password);

    if (!isEqual) {
      return res.status(403).send({ general: 'Wrong credentials, please try again.' });
    }

    const accessToken = jwt.sign(
      { credentialId: credential._id, email: inputCred.email },
      process.env.TOKEN_KEY,
      {
        expiresIn: '1h'
      }
    );

    const refreshToken = jwt.sign(
      { credentialId: credential._id, email: inputCred.email },
      process.env.TOKEN_KEY,
      {
        expiresIn: '30d'
      }
    );

    credential.token = accessToken;
    await credential.save();

    return res.status(200).json({
      accessToken,
      refreshToken,
      admin: credential.admin,
      viewOnly: credential.viewOnly
    });
  } catch (err) {
    console.error(err);
    return res.status(403).send({ general: 'Wrong credentials, please try again.' });
  }
};

// Fetch name on top bar
exports.getAppName = (req, res) => {
  try {
    AppMetadata.find({}, (err, data) => {
      if (err || !data) {
        return res.status(404).json({ error: 'App name not found.' });
      }

      return res.status(200).json({ appName: data[0].appName });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// Set new app name
exports.setAppName = async (req, res) => {
  try {
    const { appName } = req.body;
    const appMetadata = await AppMetadata.findOne();

    appMetadata.appName = appName;
    await appMetadata.save();

    return res.status(200).json({ appName: appMetadata.appName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// Receive a refresh token and validate it (through auth middleware)
// If valid, create new access token
exports.refreshLogin = async (req, res) => {
  try {
    const decodedToken = req.decodedToken;
    const credential = await Credential.findOne({ _id: decodedToken.credentialId });

    const accessToken = jwt.sign(
      { credentialId: credential._id, email: decodedToken.email },
      process.env.TOKEN_KEY,
      {
        expiresIn: '1h'
      }
    );

    credential.token = accessToken;
    await credential.save();

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};
