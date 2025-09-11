const RecentActivity = require('../models/RecentActivity');

/**
 * Utility function to log admin activities
 * @param {Object} admin - Admin user object (must have _id)
 * @param {string} action - Action type from the enum
 * @param {string} targetModel - Target model name
 * @param {string} targetId - Optional target document ID
 * @param {string} description - Human-readable description
 */
const logActivity = async (admin, action, targetModel, targetId = null, description) => {
  try {
    // Only log if admin exists and has _id
    if (!admin || !admin._id) {
      console.warn('Cannot log activity: Invalid admin object');
      return;
    }

    const newActivity = new RecentActivity({
      admin: admin._id,
      action,
      targetModel,
      targetId,
      description
    });

    await newActivity.save();
    console.log(`✅ Activity logged: ${action} - ${description}`);
    
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

/**
 * Helper functions for common actions
 */
const activityHelpers = {
  // Student actions
  logCreateStudent: (admin, studentId, studentName) => 
    logActivity(admin, 'CREATE_STUDENT', 'Student', studentId, `Created student: ${studentName}`),
  
  logEditStudent: (admin, studentId, studentName) => 
    logActivity(admin, 'EDIT_STUDENT', 'Student', studentId, `Edited student: ${studentName}`),
  
  logDeleteStudent: (admin, studentId, studentName) => 
    logActivity(admin, 'DELETE_STUDENT', 'Student', studentId, `Deleted student: ${studentName}`),
  
  logApproveStudent: (admin, studentId, studentName) => 
    logActivity(admin, 'APPROVE_STUDENT', 'Student', studentId, `Approved student: ${studentName}`),

  // Captain actions
  logCreateCaptain: (admin, captainId, captainName) => 
    logActivity(admin, 'CREATE_CAPTAIN', 'Captain', captainId, `Created captain: ${captainName}`),
  
  logEditCaptain: (admin, captainId, captainName) => 
    logActivity(admin, 'EDIT_CAPTAIN', 'Captain', captainId, `Edited captain: ${captainName}`),
  
  logDeleteCaptain: (admin, captainId, captainName) => 
    logActivity(admin, 'DELETE_CAPTAIN', 'Captain', captainId, `Deleted captain: ${captainName}`),
  
  logApproveCaptain: (admin, captainId, captainName) => 
    logActivity(admin, 'APPROVE_CAPTAIN', 'Captain', captainId, `Approved captain: ${captainName}`),

  // Position assignment actions
  logAssignPositionStudent: (admin, studentId, studentName, position) => 
    logActivity(admin, 'ASSIGN_POSITION_STUDENT', 'Student', studentId, `Assigned position "${position}" to student: ${studentName}`),
  
  logAssignPositionCaptainTeam: (admin, captainId, captainName, teamDetails) => 
    logActivity(admin, 'ASSIGN_POSITION_CAPTAIN_TEAM', 'Team', captainId, `Assigned team position to captain: ${captainName} - ${teamDetails}`),

  // Attendance actions
  logMarkAttendanceGym: (admin, sessionId, sessionName, studentCount) => 
    logActivity(admin, 'MARK_ATTENDANCE_GYM', 'Attendance', sessionId, `Marked gym attendance for session: ${sessionName} (${studentCount} students)`),
  
  logMarkAttendanceSwimming: (admin, sessionId, sessionName, studentCount) => 
    logActivity(admin, 'MARK_ATTENDANCE_SWIMMING', 'Attendance', sessionId, `Marked swimming attendance for session: ${sessionName} (${studentCount} students)`),

  // Team member actions
  logEditTeamMember: (admin, memberId, memberName) => 
    logActivity(admin, 'EDIT_TEAM_MEMBER', 'Team', memberId, `Edited team member: ${memberName}`),
  
  logDeleteTeamMember: (admin, memberId, memberName) => 
    logActivity(admin, 'DELETE_TEAM_MEMBER', 'Team', memberId, `Deleted team member: ${memberName}`),

  // Certificate actions
  logSendCertificate: (admin, certificateId, studentName) => 
    logActivity(admin, 'SEND_CERTIFICATE', 'Certificate', certificateId, `Sent certificate to student: ${studentName}`),

  // Session actions
  logSessionCreated: (admin, sessionId, sessionName) => 
    logActivity(admin, 'SESSION_CREATED', 'Session', sessionId, `Created session: ${sessionName}`),
  
  logSessionDeleted: (admin, sessionId, sessionName) => 
    logActivity(admin, 'SESSION_DELETED', 'Session', sessionId, `Deleted session: ${sessionName}`),
  
  logSessionActivated: (admin, sessionId, sessionName) => 
    logActivity(admin, 'SESSION_ACTIVATED', 'Session', sessionId, `Activated session: ${sessionName}`),

  // Generic action
  logOther: (admin, description) => 
    logActivity(admin, 'OTHER', 'User', null, description)
};

module.exports = {
  logActivity,
  ...activityHelpers
};
