const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/complaints', require('../routes/complaints'));
app.use('/api/volunteer-groups', require('../routes/volunteerGroups'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Complaint Tracker API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({ message: 'API endpoint working' });
});

// IMPORTANT: Export for Vercel
module.exports = app;
