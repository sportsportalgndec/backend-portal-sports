const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  session: {
    type: String, // e.g. "2024-25"
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// ✅ Fix: check if already compiled
module.exports = mongoose.models.Session || mongoose.model("Session", SessionSchema);

