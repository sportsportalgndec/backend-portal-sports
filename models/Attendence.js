const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "GymSwimmingStudent", required: true },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ["Present", "Absent"], required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // admin/captain
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
