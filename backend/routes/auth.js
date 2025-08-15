const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Otp = require('../models/Otp');
const router = express.Router();
const nodemailer = require('nodemailer');

// ✅ Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS // Your 16-digit Google App Password
  }
});
// ✅ GET route for API health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'PUT /api/auth/profile',
      forgotPassword: 'POST /api/auth/forgot-password',
      verifyReset: 'POST /api/auth/verify-reset'
    }
  });
});

// ✅ PUBLIC ROUTES (No auth middleware required)

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ✅ UPDATED FORGOT PASSWORD with Email Sending
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email does not exist'
      });
    }

    // Generate OTP (6-digit random number)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // Create new OTP record
    const otp = new Otp({
      email,
      otp: otpCode
    });
    await otp.save();

    // ✅ Send OTP via Email using Google App Password
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - Complaint Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Complaint Tracker account.</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #333; margin: 0;">Your OTP Code:</h3>
            <h1 style="color: #007bff; letter-spacing: 3px; margin: 10px 0;">${otpCode}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This OTP is valid for 5 minutes only</li>
            <li>Do not share this code with anyone</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
          <p>Thank you,<br>Complaint Tracker Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}: ${otpCode}`);

    res.json({
      success: true,
      message: 'OTP sent to your email address. Please check your inbox.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// Your existing verify-reset route stays the same...
router.post('/verify-reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log('🔍 Password reset request:', { email, otp: otp ? 'PROVIDED' : 'MISSING', newPassword: newPassword ? 'PROVIDED' : 'MISSING' });

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find valid OTP record
    const otpRecord = await Otp.findOne({ email, otp });
    console.log('🔍 OTP record found:', otpRecord ? 'YES' : 'NO');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    console.log('🔍 User found:', user ? 'YES' : 'NO');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();
    console.log('✅ Password updated successfully');

    // Delete the used OTP
    await Otp.deleteOne({ email, otp });
    console.log('✅ OTP deleted');

    res.json({
      success: true,
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset verification'
    });
  }
});
module.exports = router;