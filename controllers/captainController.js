const Team = require("../models/Team");
const Session = require("../models/session");

// Captain creates team (status = pending)
exports.createTeam = async (req, res) => {
  try {
    const { teamName, sport, members, sessionId } = req.body;

    // Validate main fields
    if (!teamName || !sport || !sessionId) {
      return res.status(400).json({ message: "Team name, sport, and sessionId are required" });
    }

    // Validate members array
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "At least one team member is required" });
    }

    for (const [index, member] of members.entries()) {
      if (!member.name || !member.email || !member.branch || !member.urn || !member.year || !member.phone) {
        return res.status(400).json({
          message: `Member at index ${index} is missing required fields: name, email, branch, urn, year, phone`
        });
      }
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const existingTeam = await Team.findOne({
      captainId: req.user.id,
      sessionId
    });
    if (existingTeam) {
      return res.status(400).json({ message: "Team already created for this session" });
    }

    const team = new Team({
      teamName,
      sport,
      members,
      sessionId,
      captainId: req.user.id,
      status: "pending"
    });

    await team.save();
    res.json({ message: "Team submitted for approval", team });
  } catch (err) {
    res.status(500).json({ message: "Error creating team", error: err.message });
  }
};
// Captain sees team info
exports.getCaptainTeam = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const team = await Team.findOne({
      captainId: req.user.id,
      sessionId
    });

    if (!team) {
      return res.json({ isFirstTime: true });
    }

    if (team.status === "pending") {
      return res.json({ isFirstTime: false, pendingApproval: true });
    }

    if (team.status === "rejected") {
      return res.json({ isFirstTime: false, rejected: true });
    }

    res.json({ isFirstTime: false, team });
  } catch (err) {
    res.status(500).json({ message: "Error fetching team", error: err.message });
  }
};
