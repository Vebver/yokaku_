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
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
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
};

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare the password typed with the hash in the DB
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.user_id, role: user.role || 'customer' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.user_id, 
          email: user.email, 
          firstName: user.first_name, 
          lastName: user.last_name, 
          role: user.role || 'customer' 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async signup(req, res) {
    try {
      // 1. Capture the PASSWORD from the request body
      const { firstName, lastName, email, password } = req.body;
      
      const otp = generateOTP();
      
      req.app.locals.pendingOTPs = req.app.locals.pendingOTPs || {};
      
      // 2. Store the actual password in temporary memory
      req.app.locals.pendingOTPs[email] = { 
        firstName, 
        lastName, 
        password, // <--- Storing your real password
        otp, 
        expires: Date.now() + 5*60*1000 
      };
      
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

      // 3. Use the password we stored during the signup step
      const userId = await User.create(
        email, 
        pending.password, // <--- No longer 'default123'
        pending.firstName, 
        pending.lastName
      );
      
      delete req.app.locals.pendingOTPs[email];
      
      const token = jwt.sign({ userId, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ 
        token, 
        user: { id: userId, email, firstName: pending.firstName, lastName: pending.lastName, role: 'customer' }, 
        message: 'Account created successfully' 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
async sendReservationOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const otp = generateOTP();
      
      // Store in memory (expires in 5 mins)
      req.app.locals.pendingOTPs = req.app.locals.pendingOTPs || {};
      req.app.locals.pendingOTPs[email] = { 
        otp, 
        expires: Date.now() + 5*60*1000 
      };

      await sendOTP(email, otp);
      res.json({ message: 'OTP sent to email successfully' });
    } catch (error) {
      console.error("OTP Send Error:", error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  },

  // ADD THIS METHOD (Specific for Reservation verification):
  async verifyReservationOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = req.app.locals.pendingOTPs?.[email];

      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Success! Clear the OTP so it can't be reused
      delete req.app.locals.pendingOTPs[email];
      res.json({ success: true, message: 'OTP verified' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;