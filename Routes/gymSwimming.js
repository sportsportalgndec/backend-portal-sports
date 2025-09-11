const express = require("express");
const GymSwimmingStudent = require("../models/GymSwimmingStudent");
const Session = require("../models/session");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const router = express.Router();

// ✅ Add Student (Admin only)
router.post("/add", verifyToken, isAdmin, async (req, res) => {
  try {
    let { session, ...data } = req.body;

    // Agar frontend ne session nahi bheja -> active session lagao
    if (!session) {
      const activeSession = await Session.findOne({ isActive: true });
      if (!activeSession) {
        return res.status(400).json({ error: "No active session found. Please create one." });
      }
      session = activeSession._id;
    }

    const student = new GymSwimmingStudent({
      ...data,
      session,
      createdBy: req.user._id, // ✅ ab hamesha aayega
    });

    await student.save();
    res.status(201).json({ message: "Student added successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// ✅ Get All Students (Admin only)
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const students = await GymSwimmingStudent.find()
      .populate("createdBy", "name email")
      .populate("session", "session isActive")
      .lean();

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// ✅ Update Student
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const student = await GymSwimmingStudent.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id }, // optional: track who updated
      { new: true }
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student updated successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// ✅ Delete Student
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const student = await GymSwimmingStudent.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;
