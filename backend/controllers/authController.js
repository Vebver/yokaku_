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
  console.log(`OTP ${otp} sent to ${email} (add SMTP .env for real email)`);
  // await transporter.sendMail({
  //   from: process.env.SMTP_USER,
  //   to: email,
  //   subject: 'Yokaku Admin Login OTP',
  //   text: `Your OTP is ${otp}. Valid for 5 mins.`
  // });
};

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      
      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Direct JWT - no OTP
      const token = jwt.sign({ userId: user.id, role: user.role || 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'admin' } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;

