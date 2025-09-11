const express = require('express');
const router = express.Router();
const { getTeacherDashboard } = require('../controllers/teacherController');
const { verifyToken, isTeacher } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, isTeacher, getTeacherDashboard);

module.exports = router;
