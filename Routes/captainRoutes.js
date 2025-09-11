// routes/captain.js
const express = require('express');
const router = express.Router();
const CaptainProfile = require('../models/Captain');
const TeamMember = require('../models/TeamMember');
const Session = require('../models/session');
const User = require('../models/User');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');
const resolveSession = require('../middleware/resolveSession');
const StudentProfile=require("../models/StudentProfile")

/**
 * GET captain profile for current session
 */
router.get(
  '/profile',
  verifyToken,
  roleCheck('captain'),
  resolveSession,
  async (req, res) => {
    try {
      const sessionId = req.resolvedSessionId;

      // Admin-assigned info from User
      const userDoc = await User.findById(req.user._id).select(
        'name branch urn year sport teamMemberCount email captainId'
      );

      if (!userDoc) {
        return res.status(404).json({ message: 'User record not found' });
      }

      // Captain profile by captainId + session
      const profile = await CaptainProfile.findOne({
        captainId: userDoc.captainId,
        session: sessionId,
      });

      // Fallback if profile not found
      if (!profile) {
        return res.json({
          profileComplete: false,
          data: {
            name: userDoc.name,
            branch: userDoc.branch,
            urn: userDoc.urn || '', // ✅ fallback
            year: userDoc.year,
            sport: userDoc.sport || '',
            teamMemberCount: userDoc.teamMemberCount,
            email: userDoc.email || '',
            phone: '',
            position:''
          },
        });
      }

      // If profile found → prefer profile values
      res.json({
        profileComplete: !!profile.phone,
        data: {
          name: userDoc.name,
          branch: userDoc.branch,
          urn: profile.urn || userDoc.urn || '', // ✅ prefer profile
          year: userDoc.year,
          sport: profile.sport || userDoc.sport || '',
          teamMemberCount:
            profile.teamMemberCount || userDoc.teamMemberCount,
          email: userDoc.email || '',
          phone: profile.phone || '',
          position:profile.position || '',
          certificateAvailable:profile.certificateAvailable,
          sessionId:sessionId

        },
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Error fetching profile', error: err.message });
    }
  }
);


/**
 * POST complete captain profile
 */
router.post('/profile', verifyToken, roleCheck('captain'), resolveSession, async (req, res) => {
  try {
    const sessionId = req.resolvedSessionId;
    const { phone } = req.body;

    const userDoc = await User.findById(req.user._id).select('captainId');
    if (!userDoc?.captainId) {
      return res.status(404).json({ message: 'CaptainId not found for this user' });
    }

    const existingCaptain = await CaptainProfile.findOne({
      captainId: userDoc.captainId,
      session: sessionId
    });

    if (!existingCaptain) {
      return res.status(404).json({ message: 'Captain record not found. Contact admin.' });
    }

    existingCaptain.phone = phone;
    await existingCaptain.save();

    res.json({ message: 'Profile updated successfully', profile: existingCaptain });
  } catch (err) {
    res.status(500).json({ message: 'Error saving profile', error: err.message });
  }
});

/**
 * GET team info
 */
router.get('/my-team', verifyToken, roleCheck('captain'), resolveSession, async (req, res) => {
  try {
    const sessionId = req.resolvedSessionId;
    const userDoc = await User.findById(req.user._id).select('captainId');

    const team = await TeamMember.findOne({
      captainId: userDoc.captainId,
      sessionId
    });

    if (!team) {
      return res.json({ teamExists: false, members: [], status: null });
    }
    res.json({ teamExists: true, members: team.members, status: team.status });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching team', error: err.message });
  }
});

/**
 * POST create team (bulk)
 */
router.post('/my-team', verifyToken, roleCheck('captain'), resolveSession, async (req, res) => {
  try {
    const session = await Session.findById(req.resolvedSessionId);
    if (!session?.isActive) {
      return res.status(400).json({ message: 'Cannot create team in inactive session' });
    }

    const userDoc = await User.findById(req.user._id).select('captainId');
    const existing = await TeamMember.findOne({
      captainId: userDoc.captainId,
      sessionId: req.resolvedSessionId
    });
    if (existing) {
      return res.status(400).json({ message: 'Team already exists for this session' });
    }

    const { members } = req.body;
    const profile = await CaptainProfile.findOne({
      captainId: userDoc.captainId,
      session: req.resolvedSessionId
    });

    if (!profile || !profile.phone) {
      return res.status(400).json({ message: 'Complete captain profile first' });
    }

    const newTeam = new TeamMember({
      captainId: userDoc.captainId,
      sessionId: req.resolvedSessionId,
      members,
      status: 'pending'
    });

    await newTeam.save();
    res.json({ message: 'Team submitted for approval', team: newTeam });
  } catch (err) {
    res.status(500).json({ message: 'Error creating team', error: err.message });
  }
});

/**
 * POST add a single member (one-by-one saving)
 */
router.post('/my-team/member', verifyToken, roleCheck('captain'), resolveSession, async (req, res) => {
  try {
    const session = await Session.findById(req.resolvedSessionId);
    if (!session?.isActive) {
      return res.status(400).json({ message: 'Cannot add members in inactive session' });
    }

    const userDoc = await User.findById(req.user._id).select('captainId teamMemberCount');
    const profile = await CaptainProfile.findOne({
      captainId: userDoc.captainId,
      session: req.resolvedSessionId
    });

    if (!profile || !profile.phone) {
      return res.status(400).json({ message: 'Complete captain profile first' });
    }

    const { member } = req.body;
    if (!member?.name || !member?.email) {
      return res.status(400).json({ message: 'Member name and email are required' });
    }

    let team = await TeamMember.findOne({
      captainId: userDoc.captainId,
      sessionId: req.resolvedSessionId
    });

    if (!team) {
      team = new TeamMember({
        captainId: userDoc.captainId,
        sessionId: req.resolvedSessionId,
        members: [member],
        status: 'pending'
      });
    } else {
      if (team.members.length >= userDoc.teamMemberCount) {
        return res.status(400).json({ message: 'Team is already full' });
      }
      team.members.push(member);
    }

    await team.save();
    res.json({ message: 'Member saved', team });
  } catch (err) {
    res.status(500).json({ message: 'Error saving member', error: err.message });
  }
});
// Captain History Route
router.get("/history/:urn/:sessionId", async (req, res) => {
  try {
    const { urn } = req.params;
    const { sessionId } = req.params; // ✅ session filter query se aayega

    // 1. Student Profile (session wise filter optional)
    const studentQuery = { urn };
    if (sessionId) studentQuery.session = sessionId;

    const student = await StudentProfile.findOne(studentQuery)
      .populate("session", "session")
      .lean();

    // 2. Captain Profile (session wise filter optional)
    const captainQuery = { urn };
    if (sessionId) captainQuery.session = sessionId;

    const captain = await CaptainProfile.findOne(captainQuery)
      .populate("session", "session")
      .lean();

    // ✅ agar dono hi na mile toh 404
    if (!student && !captain) {
      return res.status(404).json({ message: "No profile found for this URN" });
    }

    // 3. Sports History (student aur captain dono ka collect karke)
    const sportsHistory = [];
    if (student?.sports?.length) sportsHistory.push(...student.sports);
    if (captain?.sport) sportsHistory.push(captain.sport);

    // 4. Captain Records (urn ke hisaab se, sessionId filter lagake)
    const captainRecordsQuery = { urn };
    if (sessionId) captainRecordsQuery.session = sessionId;

    const captainRecords = await CaptainProfile.find(captainRecordsQuery)
      .populate("session", "session")
      .lean();

    // 5. Member Records (TeamMember → captainId aur members.urn dono se check karna)
    const memberQuery = {
      $or: [{ "members.urn": urn }, { captainId: captain?.captainId }],
    };
    if (sessionId) memberQuery.sessionId = sessionId;

    const memberRecords = await TeamMember.find(memberQuery)
      .populate("sessionId", "session")
      .lean();

    // ✅ Final Response
    res.json({
      student,
      captain,
      sportsHistory,
      captainRecords,
      memberRecords,
    });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Error fetching history" });
  }
});

router.get("/my-team-certificate/:captainId", async (req, res) => {
  try {
    const { captainId } = req.params;

    const captain = await Captain.findById(captainId)
      .populate("sessionId", "session")
      .populate("members"); // ensure members reference is in schema

    if (!captain || !captain.certificateAvailable) {
      return res
        .status(404)
        .json({ message: "Certificate not available yet" });
    }

    res.json({
      captain: {
        _id: captain._id,
        name: captain.name,
        urn: captain.urn,
        branch: captain.branch,
        sport: captain.sport,
        session: captain.sessionId?.session,
        position: captain.position,
      },
      members: (captain.members || []).map((m) => ({
        _id: m._id,
        name: m.name,
        urn: m.urn,
        branch: m.branch,
        sport: m.sport,
        session: captain.sessionId?.session,
        position: m.position || "Team Member",
      })),
    });
  } catch (err) {
    console.error("Error fetching team certificates:", err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
