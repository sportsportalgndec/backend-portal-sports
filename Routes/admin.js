const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Captain=require("../models/Captain")
const Certificate=require("../models/Certificate")
const TeamMember=require("../models/TeamMember")
const Session=require("../models/session")
const GymSwimmingStudent = require("../models/GymSwimmingStudent");
const mongoose = require("mongoose");
const {
  createUser,
  getAllUsers,
  getPendingProfiles,
  updateTeamStatus,
  getPendingTeams,
  rejectStudentProfile,
  approveStudentProfile,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  assignSportPosition,
  assignTeamPosition,
  getallStudents,
  getAllSports,
  getAllPositions,
  getAllSessions,
  getFilteredCaptains,
  getCaptainFilters,
  getEligibleCertificates,upload,
} = require('../controllers/adminController');
const { getAllCaptainsWithTeams } = require("../controllers/adminController");
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { logSendCertificate, logEditTeamMember, logDeleteTeamMember, logDeleteCaptain } = require('../utils/activityLogger');

// User management
router.post('/create-user', verifyToken, isAdmin, createUser);
router.get('/users', verifyToken, isAdmin, getAllUsers);

// Student profile approvals
router.get('/pending-profiles', verifyToken, isAdmin,getPendingProfiles);

// Approve student
router.put('/student/:id/approve', verifyToken, isAdmin,approveStudentProfile);

// Reject student
router.delete('/student/:id/reject', verifyToken, isAdmin,rejectStudentProfile);

// Team approvals
router.get('/pending-teams', verifyToken, isAdmin, getPendingTeams);
router.put('/team/:teamId/status', verifyToken, isAdmin, updateTeamStatus);
router.put("/assign-position", verifyToken, isAdmin, assignTeamPosition);
// ✅ Get all student profiles
router.get("/captains", getAllCaptainsWithTeams);
router.put("/captains/:id", async (req, res) => {
  try {
    const updatedCaptain = await Captain.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCaptain) return res.status(404).json({ message: "Captain not found" });
    res.json(updatedCaptain);
  } catch (err) {
    console.error("Error updating captain:", err);
    res.status(500).json({ message: "Server error updating captain" });
  }
});
router.put("/:captainId/:sessionId/members/:memberIndex",verifyToken, async (req, res) => {
  try {
    const { captainId, sessionId, memberIndex } = req.params;
    const updatedData = req.body; // { name, urn, branch, year, email, phone, sport, position }
    console.log(captainId,sessionId);
    // Find the team
    const team = await TeamMember.findOne({ captainId, sessionId: new mongoose.Types.ObjectId(sessionId) });
    if (!team) {
      return res.status(404).json({ message: "Team not found for this captain & session" });
    }

    // Check if member exists
    if (!team.members[memberIndex]) {
      return res.status(404).json({ message: "Team member not found" });
    }

    // Merge updated fields
    team.members[memberIndex] = {
      ...team.members[memberIndex]._doc,
      ...updatedData,
    };

    await team.save();
    
    // Log the activity
    const memberName = team.members[memberIndex].name || 'Team Member';
    await logEditTeamMember(req.user, team._id, memberName);
    
    res.json({ message: "Team member updated successfully", teamMembers:team.members });
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Delete a captain
router.delete("/captains/:id", verifyToken, async (req, res) => {
  try {
    const captain = await Captain.findById(req.params.id);
    if (!captain) {
      return res.status(404).json({ message: "Captain not found" });
    }

    // ✅ Delete all team members linked with this captain
    await TeamMember.deleteMany({ captainId: captain.captainId });
    const user = await User.findOne({ captainId: captain.captainId });
    if (user) {
      if (user.roles.includes("student") && user.roles.includes("captain")) {
        // Sirf captain role remove karo
        user.roles = user.roles.filter((r) => r !== "captain");
        user.captainId = undefined; // ya null
        await user.save();
      } else if (user.roles.length === 1 && user.roles[0] === "captain") {
        // Sirf captain role hai → pura user delete
        await User.findByIdAndDelete(user._id);
      }
    }


    // ✅ Delete captain
    await Captain.findByIdAndDelete(req.params.id);

    // ✅ Log the activity
    await logDeleteCaptain(req.user, captain._id, captain.name);

    res.json({ message: "Captain and associated team members deleted successfully" });
  } catch (err) {
    console.error("Error deleting captain:", err);
    res.status(500).json({ message: "Server error deleting captain" });
  }
});

// ✅ Delete a team member by index
router.delete("/captains/:captainId/:sessionId/members/:memberIndex", verifyToken, async (req, res) => {
  try {
    const { captainId, sessionId, memberIndex } = req.params;
    const sessionObjectId = new mongoose.Types.ObjectId(sessionId);

    // ✅ Captain dhoondo with session
    const captain = await Captain.findOne({ captainId, session: sessionObjectId });
    if (!captain) return res.status(404).json({ message: "Captain not found for this session" });

    // ✅ Team find karo TeamMember collection me
    const team = await TeamMember.findOne({ captainId, sessionId: sessionObjectId });
    if (!team) return res.status(404).json({ message: "Team not found for this session" });

    const index = parseInt(memberIndex, 10);
    console.log("Member Index:", index, "Captain Members:", captain.teamMembers.length);
    console.log("Captain Doc:", captain);
    console.log("Team Doc:", team);

    // --- Delete from Captain.teamMembers only if exists ---
    let deletedCaptainMember = null;
    if (index >= 0 && index < captain.teamMembers.length) {
      deletedCaptainMember = captain.teamMembers.splice(index, 1)[0];
      await captain.save();
    }

    // --- Delete from TeamMember.members ---
    if (index < 0 || index >= team.members.length) {
      return res.status(400).json({ message: "Invalid member index for team members" });
    }
    const deletedTeamMember = team.members.splice(index, 1)[0];
    team.status = "pending"; // ✅ reset status
    await team.save();

    // --- Log activity ---
    const deletedMemberName = deletedCaptainMember?.name || deletedTeamMember?.name || "Team Member";
    await logDeleteTeamMember(req.user, captain._id, deletedMemberName);

    res.json({
      message: "Team member deleted successfully",
      captain,
      team
    });
  } catch (err) {
    console.error("Error deleting team member:", err);
    res.status(500).json({ message: "Server error deleting team member" });
  }
});



router.get("/students", getAllStudents);

// GET single student by id
router.get("/student/:id", getStudentById);

// UPDATE student
router.put("/student/:id",upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signaturePhoto", maxCount: 1 },
  ]),updateStudent);

// DELETE student
router.delete("/student/:id", deleteStudent);

router.put("/students/:studentId/assign-sport-position", assignSportPosition);
router.get('/export', verifyToken, isAdmin, getallStudents);
router.get('/sports', verifyToken, isAdmin, getAllSports);
router.get("/sessions", verifyToken, isAdmin, getAllSessions);
router.get("/positions", verifyToken, isAdmin, getAllPositions);
router.post("/export-captains", verifyToken, isAdmin, getFilteredCaptains);
router.get("/captain-filters", verifyToken, isAdmin, getCaptainFilters);
router.get("/certificates", verifyToken, isAdmin, getEligibleCertificates);
// routes/admin.js


router.get("/again/captains", async (req, res) => {
  try {
    const activeSessions = await Session.find({ isActive: true })
      .select("_id session")
      .lean();

    const activeSessionIds = activeSessions.map(s => s._id.toString());

    const captains = await Captain.find({
      position: { $exists: true },
      session: { $in: activeSessionIds },
      certificateAvailable: false   // 👈 sirf pending wale
    }).lean();

    const sessionMap = {};
    activeSessions.forEach(s => {
      sessionMap[s._id.toString()] = s.session;
    });

    const formatted = captains.map(c => {
      const sessionId =
        typeof c.session === "object" && c.session?._id
          ? c.session._id.toString()
          : c.session?.toString();

      return {
        ...c,
        session: sessionId
          ? {
              _id: sessionId,
              name: sessionMap[sessionId] || null,
            }
          : null,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching captains" });
  }
});
router.get("/again/captains/sent", async (req, res) => {
  try {
    const sentCaptains = await Captain.find({
      certificateAvailable: true
    }).lean();

    res.json(sentCaptains);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching sent captains" });
  }
});





router.post("/certificates/send", async (req, res) => {
  try {
    // ids of students/captains jinko bhejna hai
    const { studentIds } = req.body;

    // Example: mark certificates as "sent"
    await Certificate.updateMany(
      { studentId: { $in: studentIds } },
      { $set: { isSent: true } }
    );

    res.json({ message: "Certificates sent to captains successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending certificates" });
  }
});
// List of captains with position allocated

router.get("/certificates/:captainId", async (req, res) => {
  try {
    const { captainId } = req.params;

    // 🔍 Captain details
    const captain = await Captain.findById(captainId).populate("session", "session");
    if (!captain) {
      return res.status(404).json({ message: "Captain not found" });
    }

    const sessionId = captain.session?._id;
    if (!sessionId) {
      return res.status(400).json({ message: "Captain has no session" });
    }

    // 🔍 Team + members
    const team = await TeamMember.findOne({
      captainId: captain.captainId, // ⚠️ Captain model me captainId string hota hai
      sessionId,
    });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // ✅ check if already certificates exist
    let certificates = await Certificate.find({ captainId, session: sessionId });

    if (certificates.length === 0) {
      const newCerts = [];

      // 🎖️ captain ka certificate
      newCerts.push({
        recipientType: "captain",
        captainId, // direct reference
        session: sessionId,
        sport: captain.sport,
        position: team.position || "Participant",
      });

      // 👥 members ke certificate
      if (team.members?.length) {
        team.members.forEach((m) => {
          newCerts.push({
            recipientType: "member",
            captainId, // captain se link
            session: sessionId,
            sport: m.sport || captain.sport,
            position: team.position || "Participant",
            memberInfo: {
              name: m.name,
              urn: m.urn,
              branch: m.branch,
              year: m.year,
              email: m.email,
              phone: m.phone,
            },
          });
        });
      }

      // Save all
      certificates = await Certificate.insertMany(newCerts);
    }

    // ✅ fetch with populate (captain + session)
    certificates = await Certificate.find({ captainId, session: sessionId })
      .populate("captainId", "name urn branch sport year")
      .populate("session", "session")
      .lean();

    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating/fetching certificates" });
  }
});

router.post("/certificates/send/:captainId",verifyToken, async (req, res) => {
  try {
    const { captainId } = req.params;

    // Fetch captain first
    const captain = await Captain.findById(captainId);
    if (!captain) {
      return res.status(404).json({ message: "Captain not found" });
    }

    // Update certificateAvailable
    captain.certificateAvailable = true;
    await captain.save();

    // Log the activity
    await logSendCertificate(req.user, captainId, captain.name);

    res.json({ success: true, message: "Certificate marked as sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending certificate" });
  }
});


// Month helper


router.get("/students-unique", async (req, res) => {
  try {
    let { sessionId } = req.query; 
    if (!sessionId) return res.status(400).json({ message: "Session ID required" });

    // Accept array or single session
    if (!Array.isArray(sessionId)) sessionId = [sessionId];

    // 🔹 Fetch students for given sessions
    const query = { session: { $in: sessionId } };

    const profiles = await StudentProfile.find(query).lean();
    const teams = await TeamMember.find(query).lean();
    const captains = await Captain.find(query).lean();
    const gymSwim = await GymSwimmingStudent.find(query).lean();

    // 🔹 Merge logic by URN
    const merged = {};

    const addToMerged = (stu, sportField = "sports", posField = "positions") => {
      if (!stu?.urn) return;
      if (!merged[stu.urn]) {
        merged[stu.urn] = {
          name: stu.name || "",
          urn: stu.urn,
          branch: stu.branch || "",
          year: stu.year || "",
          sports: [],
          positions: [],
          isCaptain: stu.isCaptain || false,
        };
      }
      if (Array.isArray(stu[sportField])) merged[stu.urn].sports.push(...stu[sportField]);
      if (Array.isArray(stu[posField])) merged[stu.urn].positions.push(...stu[posField]);
      else if (stu[posField]) merged[stu.urn].positions.push(stu[posField]);
    };

    (profiles || []).forEach((stu) => addToMerged(stu));
    (teams || []).forEach((team) => {
      (team?.members || []).forEach((mem) => addToMerged(mem, "sport", "position"));
    });
    (captains || []).forEach((cap) => addToMerged(cap, "sport", "position"));
    (gymSwim || []).forEach((gs) => addToMerged(gs, "sport", "pending"));

    res.json(Object.values(merged));
  } catch (err) {
    console.error("❌ Error merging students:", err);
    res.status(500).json({ message: "Error merging student data" });
  }
});






module.exports = router;
