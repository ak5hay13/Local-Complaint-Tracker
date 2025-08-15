const express = require('express');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth'); // JWT middleware
const router = express.Router();

// Get all complaints
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new complaint (requires authentication)
router.post('/', auth, async (req, res) => {
  try {
    const {
      category,
      description,
      priority,
      address,
      latitude,
      longitude,
      image
    } = req.body;

    // Create complaint with proper user association
    const complaint = new Complaint({
      category,
      description,
      priority,
      address,
      latitude,
      longitude,
      image,
      createdBy: req.user.userId, // From JWT middleware
      createdByUsername: req.user.username, // From JWT middleware
      status: 'pending',
      updateLog: []
    });

    await complaint.save();
    await complaint.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update complaint status
router.put('/:id', auth, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const {
      category,
      description,
      priority,
      address,
      status,
      resolvedAt,
      resolvedBy,
      resolvedByUserId,
      updateLog
    } = req.body;

    // Update fields
    if (category) complaint.category = category;
    if (description) complaint.description = description;
    if (priority) complaint.priority = priority;
    if (address) complaint.address = address;
    if (status) complaint.status = status;
    if (resolvedAt) complaint.resolvedAt = resolvedAt;
    if (resolvedBy) complaint.resolvedBy = resolvedBy;
    if (resolvedByUserId) complaint.resolvedByUserId = resolvedByUserId;
    
    // Handle update log entries
    if (updateLog && updateLog.length > 0) {
      const enhancedUpdateLog = updateLog.map(log => ({
        timestamp: log.timestamp || new Date().toISOString(),
        action: log.action,
        user: req.user.username || req.user.email,
        userId: req.user.userId,
        description: log.description,
        afterPhoto: log.afterPhoto,
        location: log.location,
        distanceFromOriginal: log.distanceFromOriginal,
        changes: log.changes
      }));
      
      complaint.updateLog.push(...enhancedUpdateLog);
    }

    await complaint.save();
    await complaint.populate('createdBy', 'username email');

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
