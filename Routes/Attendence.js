const express = require("express");
const Attendance = require("../models/Attendence");
const GymSwimmingStudent = require("../models/GymSwimmingStudent");
const { verifyToken, isAdmin, isTeacher } = require("../middleware/authMiddleware");
const { logMarkAttendanceGym, logMarkAttendanceSwimming } = require("../utils/activityLogger");
const router = express.Router();
// ✅ Mark Attendance (Admin + Teacher dono kar sakte)
router.post(
  "/mark",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { studentId, status, sessionId, date } = req.body;
      if (!studentId || !sessionId) return res.status(400).json({ message: "StudentId and SessionId required" });

      const attendanceDate = date ? new Date(date) : new Date();

      // Start & end of day
      const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(attendanceDate.setHours(23, 59, 59, 999));

      // 🔹 Check existing attendance for same student + session + date
      let existing = await Attendance.findOne({
        student: studentId,
        session: sessionId,
        date: { $gte: startOfDay, $lt: endOfDay },
      });

      if (existing) {
        existing.status = status;
        existing.markedBy = req.user._id;
        await existing.save();
        return res.json({ message: "Attendance updated", record: existing });
      }

      // 🔹 New attendance record
      const record = new Attendance({
        student: studentId,
        status,
        session: sessionId,
        markedBy: req.user._id,
        date: attendanceDate,
      });

      await record.save();
      
         // ✅ Fetch student only once and log activity accordingly
         const student = await GymSwimmingStudent.findById(studentId);
         if (student) {
           if (student.sport === "Gym") {
             await logMarkAttendanceGym(req.user, sessionId, "Session", record._id);
           } else if (student.sport === "Swimming") {
             await logMarkAttendanceSwimming(req.user, sessionId, "Session", record._id);
           }
         }
   
      
      res.status(201).json({ message: "Attendance marked", record });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to mark attendance" });
    }
  }
);

// ✅ Get Attendance by Date (session-aware)
// GET Attendance by Date (Admin + Teacher)
router.get("/:date", verifyToken, (req, res, next) => {
  if (!["admin","teacher"].includes(req.user.activeRole)) {
    return res.status(403).json({ message: "Only admin or teacher can view attendance" });
  }
  next();
}, async (req, res) => {
  try {
    const { date } = req.params;
    const { sessionId } = req.query; // ← session filter

    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const filter = {
      date: { $gte: start, $lt: end },
    };

    if (sessionId) {
      filter.session = sessionId; // ← only this session
    }

    const records = await Attendance.find(filter)
      .populate("student", "name urn crn branch year sport")
      .populate("markedBy", "name email role")
      .populate("session", "session isActive");

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});


module.exports = router;
