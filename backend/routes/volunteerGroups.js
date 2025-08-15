const express = require('express');
const VolunteerGroup = require('../models/VolunteerGroup');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all volunteer groups
router.get('/', async (req, res) => {
  try {
    const groups = await VolunteerGroup.find()
      // ❌ REMOVED: .populate('createdBy', 'username email') - This was causing the issue
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching volunteer groups:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new volunteer group
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 Creating volunteer group:', req.body);
    console.log('👤 User info:', req.user);

    const groupData = {
      ...req.body,
      createdBy: req.user.userId,
      createdByUsername: req.user.username || req.user.email
    };

    const group = new VolunteerGroup(groupData);
    await group.save();
    // ❌ REMOVED: await group.populate('createdBy', 'username email'); - This was also causing issues

    console.log('✅ Volunteer group created successfully:', group._id);

    res.status(201).json({
      success: true,
      message: 'Volunteer group created successfully',
      data: group
    });
  } catch (error) {
    console.error('❌ Error creating volunteer group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Join a volunteer group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await VolunteerGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer group not found'
      });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Group is already full'
      });
    }

    // Check if user is already a member
    if (group.members.some(member => member.userId.toString() === req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Add user to group
    group.members.push({
      userId: req.user.userId,
      username: req.user.username || req.user.email,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    res.json({
      success: true,
      message: 'Successfully joined the group',
      data: group
    });
  } catch (error) {
    console.error('Error joining volunteer group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Leave a volunteer group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    console.log(`🚪 User ${req.user.username} (ID: ${req.user.userId}) leaving group ${req.params.id}`);
    
    const group = await VolunteerGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer group not found'
      });
    }

    console.log('👥 Members before leaving:', group.members.map(m => ({
      username: m.username,
      userId: m.userId.toString()
    })));
    console.log('🔍 User trying to leave:', req.user.userId);

    // Remove user from group
    const initialCount = group.members.length;
    group.members = group.members.filter(
      member => {
        const match = member.userId.toString() === req.user.userId.toString();
        console.log(`Checking member ${member.username}: ${member.userId} === ${req.user.userId} = ${match}`);
        return !match; // Keep members that DON'T match
      }
    );
    
    console.log(`📊 Members reduced from ${initialCount} to ${group.members.length}`);
    console.log('👥 Members after leaving:', group.members.map(m => m.username));

    // Save the updated group
    await group.save();
    console.log('💾 Group saved successfully');

    res.json({
      success: true,
      message: 'Successfully left the group',
      data: group
    });
  } catch (error) {
    console.error('❌ Error leaving volunteer group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});


// Delete a volunteer group
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await VolunteerGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer group not found'
      });
    }

    // FIXED: Add debugging and proper comparison
    console.log('🔍 Delete group check:');
    console.log('Group createdBy:', group.createdBy);
    console.log('Group createdBy type:', typeof group.createdBy);
    console.log('Request user ID:', req.user.userId);
    console.log('Request user ID type:', typeof req.user.userId);
    console.log('Comparison result:', group.createdBy.toString() === req.user.userId);

    // Check if user is the group creator - FIXED comparison
    if (group.createdBy.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete this group'
      });
    }

    await VolunteerGroup.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Volunteer group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting volunteer group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
