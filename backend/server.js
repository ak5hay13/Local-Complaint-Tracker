require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const volunteerGroupRoutes = require('./routes/volunteerGroups'); // ← Add this line

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/volunteer-groups', volunteerGroupRoutes); // ← Add this line

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Complaint Tracker API is running!',
    endpoints: {
      auth: '/api/auth',
      complaints: '/api/complaints',
      volunteerGroups: '/api/volunteer-groups' // ← Add this
    }
  });
});

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/complaint_tracker')
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log(`🔑 JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📋 Available endpoints:`);
      console.log(`   - GET/POST /api/volunteer-groups`);
      console.log(`   - POST /api/volunteer-groups/:id/join`);
      console.log(`   - POST /api/volunteer-groups/:id/leave`);
      console.log(`   - DELETE /api/volunteer-groups/:id`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
