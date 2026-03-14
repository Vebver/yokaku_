require('dotenv').config();
const express = require('express');
const cors = require('cors');
const User = require('./models/User');
const authController = require('./controllers/authController');
const jwt = require('jsonwebtoken');
const controller = require('./controllers/controller');

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

// Items routes (CRUD example)
app.get('/api/items', controller.getAllItems);
app.get('/api/items/:id', controller.getItemById);
app.post('/api/items', authMiddleware, controller.createItem);
app.put('/api/items/:id', authMiddleware, controller.updateItem);
app.delete('/api/items/:id', authMiddleware, controller.deleteItem);

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

