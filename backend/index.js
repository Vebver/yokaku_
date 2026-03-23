require('dotenv').config();
const express = require('express');
const cors = require('cors');
const User = require('./models/User');
const authController = require('./controllers/authController');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Auth routes
app.post('/api/auth/login', authController.login);
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/verifyOTP', authController.verifyOTP);

app.post('/api/otp/send', authController.sendReservationOTP);
app.post('/api/otp/verify', authController.verifyReservationOTP);

// backend/routes/reservation.js
app.post('/api/reserve', (req, res) => {
    // FORCE RESPONSE IMMEDIATELY FOR TESTING
    console.log("📥 [TEST] Request received! Sending response back to React NOW.");
    
    // This will trigger the Alert in React instantly
    res.status(200).json({ success: true, message: "TESTING" });

    // NOW try the database stuff in the background
    let { date, time, guests, email, firstName, lastName, phone, packageName, userId } = req.body;
    const sql = `INSERT INTO reservations (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;
    
    User.pool.query(sql, [userId || null, firstName, lastName, email, phone, date, "12:00:00", guests, packageName], (err) => {
        if (err) console.error("❌ DB Background Error:", err.message);
        else console.log("✅ DB Background Success!");
    });
});

// Protected routes example
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});


app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Test pool
  try {
    await User.pool.getConnection();
    console.log('MySQL pool ready');
  } catch (error) {
    console.error('DB pool error:', error.message);
  }
});

