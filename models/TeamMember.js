// models/TeamMember.js
const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  urn: { type: String },
  branch: { type: String },
  year: { type: Number },
  email: { type: String, required: true },
  phone: { type: String },
  sport: { type: String },
  position: { type: String, default: null }
}, { _id: false });

const TeamMemberSchema = new mongoose.Schema({
  captainId: { type: String, required: true }, // store captainId (string from User)
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  
  members: { type: [MemberSchema], default: [] }, // all members in one array
  position: { type: String, default:"pending" },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
