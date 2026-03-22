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

// backend/routes/reservation.js
app.post('/api/reserve', (req, res) => {
    // 1. Destructure incoming data
    let { date, time, guests, email, firstName, lastName, phone, packageName, userId } = req.body;

    // --- CRUCIAL FIX for user_id ---
    // Convert string "null", empty strings, or undefined into a real JavaScript null
    // This ensures MySQL receives a valid NULL or a valid Number.
    const finalUserId = (userId === "null" || userId === "" || !userId) ? null : userId;

    // 2. Convert "12:00 PM" to "12:00:00" for MySQL TIME column
    try {
        const [timePart, period] = time.split(' '); 
        let [hours, minutes] = timePart.split(':'); 
        
        let hoursInt = parseInt(hours);
        if (period === 'PM' && hoursInt !== 12) {
            hoursInt += 12;
        } else if (period === 'AM' && hoursInt === 12) {
            hoursInt = 0;
        }
        
        // Ensure hours are padded with a zero if needed (e.g., "09:00:00")
        const formattedHours = hoursInt.toString().padStart(2, '0');
        const formattedTime = `${formattedHours}:${minutes}:00`;

        // 3. SQL Query
        const sql = `INSERT INTO reservations 
        (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

        // 4. Execute Query
        db.query(
            sql, 
            [finalUserId, firstName, lastName, email, phone, date, formattedTime, guests, packageName], 
            (err, result) => {
                if (err) {
                    console.error("❌ Database Error:", err.message);
                    return res.status(500).json({ error: err.message });
                }
                
                console.log("✅ Reservation Saved! ID:", result.insertId);
                return res.status(200).json({ 
                    success: true,
                    message: "Reservation successfully saved",
                    id: result.insertId
                });
            }
        );
    } catch (error) {
        console.error("❌ Time Format Error:", error);
        return res.status(400).json({ error: "Invalid time format provided." });
    }
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

