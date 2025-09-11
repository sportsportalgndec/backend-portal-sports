const express = require('express');
const StudentProfile = require('../models/StudentProfile');
const Session = require('../models/session');
const User = require('../models/User');
const router = express.Router();
const TeamMember = require("../models/TeamMember");
const Captain = require("../models/Captain"); // captain + members yahi me hai

const {
  getStudentProfile,
  updateStudentProfile,
  submitStudentProfile,
  markNotificationsRead,
  uploadStudentPhoto,
  uploadMiddleware
} = require('../controllers/studentController');

const { verifyToken, isStudent } = require('../middleware/authMiddleware');
const resolveSession = require('../middleware/resolveSession');

// ✅ Get student profile (active session or specified session)
router.get('/profile', verifyToken, isStudent, resolveSession, getStudentProfile);

// ✅ Update profile
router.put('/profile', verifyToken, isStudent, resolveSession, updateStudentProfile);

// ✅ Submit profile for approval
router.post('/submit-profile', verifyToken, isStudent, resolveSession, submitStudentProfile);

// ✅ Mark notifications as read
router.post('/mark-notifications-read', verifyToken, isStudent, markNotificationsRead);

// ✅ Get all sessions for a student (ensures profile exists in active session)
router.get('/my-sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all profiles for this student
    const profiles = await StudentProfile.find({ userId }, 'session').lean();
    const sessionIdsWithProfile = profiles.map(p => p.session?.toString()).filter(Boolean);

    // Ensure profile exists for active session
    const activeSession = await Session.findOne({ isActive: true }).lean();

    if (activeSession && !sessionIdsWithProfile.includes(activeSession._id.toString())) {
      const lastProfile = await StudentProfile.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();

      if (lastProfile) {
        // ✅ clone properly
        const newProfile = new StudentProfile({
          userId,
          session: activeSession._id,

          // carry forward
          name: lastProfile.name,
          urn: lastProfile.urn,
          branch: lastProfile.branch,
          year: lastProfile.year,
          crn: lastProfile.crn,
          dob: lastProfile.dob,
          gender: lastProfile.gender,
          contact: lastProfile.contact,
          address: lastProfile.address,
          fatherName: lastProfile.fatherName,
          yearOfPassingMatric: lastProfile.yearOfPassingMatric,
          yearOfPassingPlusTwo: lastProfile.yearOfPassingPlusTwo,
          firstAdmissionDate: lastProfile.firstAdmissionDate,
          lastExamName: lastProfile.lastExamName,
          lastExamYear: lastProfile.lastExamYear,
          yearsOfParticipation: (lastProfile.yearsOfParticipation || 0) + 1,
          photo: lastProfile.photo,
          signaturePhoto: lastProfile.signaturePhoto,
          interCollegeGraduateCourse: lastProfile.interCollegeGraduateCourse ?? 0,
          interCollegePgCourse: lastProfile.interCollegePgCourse ?? 0,

          // reset for new session
          sports: [],
          positions: [],
          status: { personal: "none", sports: "none" },
          notifications: [],
          isCloned: true, // ✅ always true for clones
        });

        await newProfile.save();
        sessionIdsWithProfile.push(activeSession._id.toString());
      }
      // ⚠️ else: if no lastProfile, skip creating empty doc.
      // let getStudentProfile handle this case
    }

    // Fetch all sessions linked to profiles
    const sessions = await Session.find({ _id: { $in: sessionIdsWithProfile } }).lean();

    res.json(sessions);
  } catch (err) {
    console.error('Error fetching student sessions:', err);
    res.status(500).json({ message: 'Server error fetching student sessions' });
  }
});


// ✅ Upload student photo
router.post(
  '/upload-photo',
  verifyToken,
  isStudent,
  resolveSession,
  uploadMiddleware,     // multer middleware (single photo)
  uploadStudentPhoto    // controller
);
// routes/student.js


// GET student full history by URN
router.get("/history/:urn/:sessionId", async (req, res) => {
  try {
    const { urn } = req.params;
    const { sessionId } = req.params; // ✅ session id query se aayega

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    // 1. Student Profile (filter session ke hisaab se)
    const student = await StudentProfile.findOne({ urn, session: sessionId })
      .populate("session", "session")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found for this session" });
    }

    // 2. Captain History (sirf iss session ka)
    const captainRecords = await Captain.find({ urn, session: sessionId })
      .populate("session", "session")
      .lean();

    // 3. Member History (sirf iss session ka)
    const memberRecords = await TeamMember.find({
      "members.urn": urn,
      sessionId: sessionId
    })
      .populate("sessionId", "session")
      .lean();

    // 4. Sports History (sirf student ke iss session ka)
    const sportsHistory = student.sports || [];

    res.json({
      student,
      sportsHistory,
      captainRecords,
      memberRecords,
    });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Error fetching student history" });
  }
});





module.exports = router;
