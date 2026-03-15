const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'test',
    pass: process.env.SMTP_PASS || 'test'
  }
});

// Rate limit OTP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 3
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Hangout OTP Verification',
    text: `Your OTP is ${otp}. Valid for 5 mins.`,
    html: `<h2>Your Hangout OTP</h2><p style="font-size: 24px; font-weight: bold;">${otp}</p><p>Valid for 5 minutes.</p>`
  });
  console.log(`Real OTP ${otp} sent to ${email}`);
};

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      
      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role || 'customer' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'customer' } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async signup(req, res) {
    try {
      const { name, email } = req.body;
      const otp = generateOTP();
      
      // Store OTP temporarily (use Redis or DB in production)
      req.app.locals.pendingOTPs = req.app.locals.pendingOTPs || {};
      req.app.locals.pendingOTPs[email] = { otp, expires: Date.now() + 5*60*1000 };
      
      await sendOTP(email, otp);
      
      res.json({ message: 'OTP sent to email', email });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = req.app.locals.pendingOTPs?.[email];
      
      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Create user
      const password = 'default123'; // In production, collect password
      const userId = await User.create(email, password);
      
      // Cleanup OTP
      delete req.app.locals.pendingOTPs[email];
      
      const token = jwt.sign({ userId, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: userId, email, role: 'customer' }, message: 'Account created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;

