const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  address: {
    type: String,
    required: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  image: {
    type: String // Base64 encoded image
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'partial-completed', 'completed', 'resolved'],
    default: 'pending'
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
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  },
  resolvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updateLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: String,
    user: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    afterPhoto: String,
    location: {
      lat: Number,
      lng: Number
    },
    distanceFromOriginal: String,
    changes: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', complaintSchema);
