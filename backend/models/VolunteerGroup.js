const mongoose = require('mongoose');

const volunteerGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 20
  },
  requiredSkills: [{
    type: String
  }],
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  complaintTitle: {
    type: String,
    required: true
  },
  complaintLocation: {
    address: String,
    latitude: Number,
    longitude: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByUsername: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'active', 'completed', 'closed'],
    default: 'open'
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('VolunteerGroup', volunteerGroupSchema);
