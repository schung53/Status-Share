const Mailbox = require('../models/mailbox');
const Team = require('../models/team');
const User = require('../models/user');

// Fetch all teams
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({});

    return res.status(200).json(teams);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: err.message });
  }
};

// Create a new team
exports.postOneTeam = async (req, res) => {
  try {
    const newTeam = {
      team: req.body.team,
      priority: req.body.priority,
      color: req.body.color,
      col1: req.body.col1,
      col2: req.body.col2,
      col3: req.body.col3,
      checkInCol: req.body.checkInCol,
      hyperlink: req.body.hyperlink
    };

    const team = await Team.create({ ...newTeam });
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: err.message });
  }
};

// Update a team's details
exports.updateTeam = async (req, res) => {
  const updatedTeam = {
    team: req.body.team,
    priority: req.body.priority,
    color: req.body.color,
    col1: req.body.col1,
    col2: req.body.col2,
    col3: req.body.col3,
    checkInCol: req.body.checkInCol,
    hyperlink: req.body.hyperlink
  };
  const teamId = req.params.teamId;

  try {
    const team = await Team.findOne({ _id: teamId });

    if (updatedTeam.team !== team.team) {
      const users = await User.find({ teamId: teamId });

      users.forEach(async (user) => {
        user.team = updatedTeam.team;
        user.save();
      });
    }

    for (const key of Object.keys(updatedTeam)) {
      team[key] = updatedTeam[key];
    }
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: err.message });
  }
};

// Permanently delete a team
exports.deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    Team.deleteOne({ _id: teamId }, async (err) => {
      if (err) return res.status(404).send({ message: err.message });

      const users = await User.find({ teamId: teamId });

      users.forEach(async (user) => {
        await User.deleteOne({ _id: user._id });
        await Mailbox.deleteOne({ userId: user._id });
      });

      return res.status(200).send({
        message: `Team ${teamId} deleted successfully.`,
        _id: teamId
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: err.message });
  }
};
