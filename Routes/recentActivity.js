const express = require('express');
const router = express.Router();
const RecentActivity = require('../models/RecentActivity');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/recent-activities - Log a new activity
router.post('/', verifyToken, async (req, res) => {
  try {
    const { action, targetModel, targetId, description } = req.body;
    
    // Verify that the user is an admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admins can log activities' 
      });
    }

    // Validate required fields
    if (!action || !targetModel || !description) {
      return res.status(400).json({
        success: false,
        message: 'action, targetModel, and description are required'
      });
    }

    // Create new activity
    const newActivity = new RecentActivity({
      admin: req.user._id,
      action,
      targetModel,
      targetId,
      description
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: newActivity
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/recent-activities - Fetch recent activities
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};
    
    if (req.query.action) {
      query.action = req.query.action;
    }
    
    if (req.query.targetModel) {
      query.targetModel = req.query.targetModel;
    }
    
    if (req.query.admin) {
      query.admin = req.query.admin;
    }

    // Fetch activities with pagination and populate admin details
    const activities = await RecentActivity.find(query)
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await RecentActivity.countDocuments(query);

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/recent-activities/:id - Fetch single activity by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await RecentActivity.findById(id)
      .populate('admin', 'name email');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
