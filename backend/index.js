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

// Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await User.pool.execute('SELECT 1 as test');
    res.json({ message: 'DB connected', test: rows[0].test });
  } catch (error) {
    res.status(500).json({ error: 'DB connection failed' });
  }
});

// Auth routes
app.post('/api/auth/login', authController.login);
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/verifyOTP', authController.verifyOTP);

// backend/routes/reservation.js
app.post('/api/reserve', (req, res) => {
    const { date, time, guests, email, firstName, lastName, phone, packageName, userId } = req.body;

    // Convert "12:00 PM" to "12:00:00" for MySQL
    const [timePart, period] = time.split(' '); 
    let [hours, minutes] = timePart.split(':'); 
    if (period === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
    else if (period === 'AM' && hours === '12') hours = '00';
    const formattedTime = `${hours}:${minutes}:00`;

    const sql = `INSERT INTO reservations 
    (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

    db.query(sql, [userId || null, firstName, lastName, email, phone, date, formattedTime, guests, packageName], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).send("Success");
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

