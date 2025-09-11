const mongoose = require('mongoose');

const RecentActivitySchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'CREATE_STUDENT',
      'CREATE_CAPTAIN',
      'ASSIGN_POSITION_STUDENT',
      'ASSIGN_POSITION_CAPTAIN_TEAM',
      'APPROVE_CAPTAIN',
      'APPROVE_STUDENT',
      'MARK_ATTENDANCE_GYM',
      'MARK_ATTENDANCE_SWIMMING',
      'EDIT_CAPTAIN',
      'DELETE_CAPTAIN',
      'EDIT_TEAM_MEMBER',
      'DELETE_TEAM_MEMBER',
      'EDIT_STUDENT',
      'DELETE_STUDENT',
      'SEND_CERTIFICATE',
      'SESSION_CREATED',
      'SESSION_DELETED',
      'SESSION_ACTIVATED',
      'OTHER'
    ],
    required: true
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['Student', 'Captain', 'Team', 'Attendance', 'Session', 'Certificate', 'User']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  description: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Index for efficient querying
RecentActivitySchema.index({ admin: 1, createdAt: -1 });
RecentActivitySchema.index({ action: 1, createdAt: -1 });
RecentActivitySchema.index({ targetModel: 1, createdAt: -1 });

module.exports = mongoose.model('RecentActivity', RecentActivitySchema);
