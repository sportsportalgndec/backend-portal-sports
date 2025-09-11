# Recent Activity Tracking System

## Overview
The Recent Activity Tracking System automatically logs all administrative actions performed in the sports management application. This system provides a comprehensive audit trail of all changes made by administrators.

## Features

### 🔍 **Automatic Activity Logging**
- Tracks all admin actions in real-time
- Stores detailed information about each action
- Maintains audit trail for compliance and debugging

### 📊 **Comprehensive Action Coverage**
The system tracks the following admin actions:

#### Student Management
- `CREATE_STUDENT` - Creating new student profiles
- `EDIT_STUDENT` - Modifying existing student information
- `DELETE_STUDENT` - Removing student records
- `APPROVE_STUDENT` - Approving student registrations
- `ASSIGN_POSITION_STUDENT` - Assigning sports positions to students

#### Captain Management
- `CREATE_CAPTAIN` - Creating new captain profiles
- `EDIT_CAPTAIN` - Modifying captain information
- `DELETE_CAPTAIN` - Removing captain records
- `APPROVE_CAPTAIN` - Approving captain applications
- `ASSIGN_POSITION_CAPTAIN_TEAM` - Assigning team positions

#### Team Management
- `EDIT_TEAM_MEMBER` - Modifying team member details
- `DELETE_TEAM_MEMBER` - Removing team members

#### Attendance Tracking
- `MARK_ATTENDANCE_GYM` - Recording gym attendance
- `MARK_ATTENDANCE_SWIMMING` - Recording swimming attendance

#### Session Management
- `SESSION_CREATED` - Creating new sessions
- `SESSION_DELETED` - Removing sessions
- `SESSION_ACTIVATED` - Activating sessions

#### Certificate Management
- `SEND_CERTIFICATE` - Issuing certificates to students

#### Other Actions
- `OTHER` - Custom actions not covered by specific types

## Database Schema

### RecentActivity Model
```javascript
{
  admin: ObjectId,        // Reference to User (admin who performed action)
  action: String,         // Action type from enum
  targetModel: String,    // Target model name (Student, Captain, Team, etc.)
  targetId: ObjectId,     // Optional reference to affected document
  description: String,    // Human-readable description of action
  timestamps: {           // Automatic timestamps
    createdAt: Date,
    updatedAt: Date
  }
}
```

### Target Models
- `Student` - Student profiles and records
- `Captain` - Captain profiles and records
- `Team` - Team compositions and members
- `Attendance` - Attendance records
- `Session` - Session management
- `Certificate` - Certificate issuance
- `User` - User account management

## API Endpoints

### 1. Log New Activity
```
POST /api/recent-activities
```
**Body:**
```json
{
  "action": "CREATE_STUDENT",
  "targetModel": "Student",
  "targetId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "description": "Created new student: John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Activity logged successfully",
  "data": { /* activity object */ }
}
```

### 2. Fetch Recent Activities
```
GET /api/recent-activities?limit=20&page=1&action=CREATE_STUDENT&targetModel=Student
```

**Query Parameters:**
- `limit` - Number of activities per page (default: 20)
- `page` - Page number (default: 1)
- `action` - Filter by action type
- `targetModel` - Filter by target model
- `admin` - Filter by admin user ID

**Response:**
```json
{
  "success": true,
  "data": [ /* array of activities */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

### 3. Fetch Single Activity
```
GET /api/recent-activities/:id
```

**Response:**
```json
{
  "success": true,
  "data": { /* single activity object */ }
}
```

## Integration Points

### Automatic Logging
The system automatically logs activities when admins perform these actions:

#### Admin Controller
- User creation/editing (students, captains)
- Student profile approvals
- Position assignments
- Student deletions

#### Session Controller
- Session creation
- Session activation
- Session deletion

#### Attendance Routes
- Marking attendance (gym/swimming)

#### Admin Routes
- Team member management
- Captain deletions
- Certificate sending
- Team status updates

### Manual Logging
You can manually log activities using the utility functions:

```javascript
const { logActivity, logCreateStudent } = require('../utils/activityLogger');

// Manual logging
await logActivity(adminUser, 'CUSTOM_ACTION', 'User', userId, 'Custom description');

// Using helper functions
await logCreateStudent(adminUser, studentId, studentName);
```

## Utility Functions

### Basic Logging
- `logActivity(admin, action, targetModel, targetId, description)`

### Student Actions
- `logCreateStudent(admin, studentId, studentName)`
- `logEditStudent(admin, studentId, studentName)`
- `logDeleteStudent(admin, studentId, studentName)`
- `logApproveStudent(admin, studentId, studentName)`

### Captain Actions
- `logCreateCaptain(admin, captainId, captainName)`
- `logEditCaptain(admin, captainId, captainName)`
- `logDeleteCaptain(admin, captainId, captainName)`
- `logApproveCaptain(admin, captainId, captainName)`

### Position Assignments
- `logAssignPositionStudent(admin, studentId, studentName, position)`
- `logAssignPositionCaptainTeam(admin, captainId, captainName, teamDetails)`

### Attendance Actions
- `logMarkAttendanceGym(admin, sessionId, sessionName, studentCount)`
- `logMarkAttendanceSwimming(admin, sessionId, sessionName, studentCount)`

### Team Management
- `logEditTeamMember(admin, memberId, memberName)`
- `logDeleteTeamMember(admin, memberId, memberName)`

### Certificates & Sessions
- `logSendCertificate(admin, certificateId, studentName)`
- `logSessionCreated(admin, sessionId, sessionName)`
- `logSessionDeleted(admin, sessionId, sessionName)`
- `logSessionActivated(admin, sessionId, sessionName)`

## Security Features

### Authentication Required
- All endpoints require valid authentication token
- Only admin users can log activities
- Admin verification on all activity logging

### Data Validation
- Required field validation
- Enum validation for action types
- Target model validation

## Performance Optimizations

### Database Indexes
- Index on `admin` field for efficient user-based queries
- Index on `action` field for action-based filtering
- Index on `targetModel` field for model-based filtering
- Compound index on `admin` + `createdAt` for user activity history

### Pagination
- Default limit of 20 activities per page
- Efficient skip/limit pagination
- Total count for pagination controls

## Usage Examples

### Frontend Integration
```javascript
// Fetch recent activities
const response = await fetch('/api/recent-activities?limit=10');
const activities = await response.json();

// Display activities
activities.data.forEach(activity => {
  console.log(`${activity.action}: ${activity.description}`);
  console.log(`Admin: ${activity.admin.name}`);
  console.log(`Time: ${new Date(activity.createdAt).toLocaleString()}`);
});
```

### Activity Dashboard
```javascript
// Filter by specific action
const createActions = await fetch('/api/recent-activities?action=CREATE_STUDENT');
const createData = await createActions.json();

// Filter by target model
const studentActions = await fetch('/api/recent-activities?targetModel=Student');
const studentData = await studentActions.json();
```

## Testing

### Run Test Script
```bash
cd backend
node test-activity-logging.js
```

This will test:
- Database connection
- Activity creation
- Activity retrieval
- Data cleanup

## Monitoring & Maintenance

### Log Analysis
- Track admin activity patterns
- Monitor system usage
- Identify potential issues

### Data Retention
- Activities are stored indefinitely
- Consider implementing cleanup policies for old data
- Monitor database size growth

### Performance Monitoring
- Query execution times
- Index usage statistics
- Database connection health

## Troubleshooting

### Common Issues

1. **Activity Not Logging**
   - Check admin authentication
   - Verify required fields are provided
   - Check database connection

2. **Performance Issues**
   - Verify database indexes exist
   - Check query execution plans
   - Monitor database performance

3. **Data Inconsistencies**
   - Verify target document references
   - Check admin user validity
   - Validate action enum values

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=recent-activity
```

## Future Enhancements

### Planned Features
- Activity export functionality
- Advanced filtering and search
- Activity analytics dashboard
- Email notifications for critical actions
- Activity archiving system

### Custom Actions
- Support for custom action types
- Dynamic target model registration
- Configurable action categories

## Support

For issues or questions about the Recent Activity system:
1. Check the logs for error messages
2. Verify database connectivity
3. Test with the provided test script
4. Review this documentation

---

**Note:** This system is designed to be non-intrusive and will not break main functionality if activity logging fails. All errors are caught and logged without affecting the primary operations.
