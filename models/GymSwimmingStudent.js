const mongoose = require('mongoose');

const GymSwimmingStudentSchema = new mongoose.Schema({
    name: { type: String, required: true },       // assigned by admin
    branch: { type: String, required: true },     // assigned by admin
    urn: { type: String, required: true },        // assigned by admin (unique within sport)
    crn: { type: String, required: true },        // assigned by admin
    year: { type: Number, required: true },       // assigned by admin
    sport: { type: String, enum: ["Gym", "Swimming"], required: true }, // assigned by admin

    // filled by captain on first login (optional)
    email: { type: String },
    phone: { type: String },

    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

// 🔥 Compound unique index: URN must be unique inside each sport
GymSwimmingStudentSchema.index({ urn: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model("GymSwimmingStudent", GymSwimmingStudentSchema);
