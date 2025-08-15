const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/complaints', require('../routes/complaints'));
app.use('/api/volunteer-groups', require('../routes/volunteer-groups'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Complaint Tracker API is running!',
    endpoints: {
      auth: '/api/auth',
      complaints: '/api/complaints',
      volunteerGroups: '/api/volunteer-groups'
    }
  });
});

// Export for Vercel
module.exports = app;
