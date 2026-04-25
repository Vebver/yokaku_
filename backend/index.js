require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http"); // Added for Socket.io
const { Server } = require("socket.io"); // Added for Socket.io

const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const userController = require("./controllers/userController");
const { protect, adminOnly } = require("./middleware/authMiddleware");
const reservationRoutes = require("./routes/reservationRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const adminRoutes = require('./routes/adminRoutes');
const billingRoutes = require('./routes/billingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');

const PORT = process.env.PORT || 5000;
const app = express();

// Create HTTP server to wrap the express app
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- SOCKET.IO LOGIC ---
io.on("connection", (socket) => {
  console.log(`📡 New client connected: ${socket.id}`);

  // Listen for order from KioskReservationMenu.jsx
  socket.on("send_order", (orderData) => {
    console.log("📦 Order received from kiosk:", orderData.id);
    
    // Broadcast order to KitchenPage.jsx
    io.emit("new_order", orderData);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// --- 1. MIDDLEWARE ---
app.use(cors({ origin: "http://localhost:5173", credentials: true })); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- 2. ROUTES ---

// Public Auth routes (Login, Signup)
app.use('/api/auth', authRoutes);

// OTP routes (Send/Verify for Reservations)
app.use("/api/otp", otpRoutes);

// Profile routes (PROTECTED)
app.get("/api/profile", protect, userController.getProfile);
app.put("/api/profile", protect, userController.updateProfile);

// Address routes
app.use('/api/address', addressRoutes);

// Reservation routes
app.use("/api/reservations", reservationRoutes);

// Product routes
app.use("/api/products", productRoutes);

// Category routes
app.use("/api/categories", categoryRoutes);

// Inventory routes
app.use('/api/inventory', protect, adminOnly, inventoryRoutes);

// Static folder for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin routes
app.use('/api/admin', protect, adminOnly, adminRoutes);

// Billing routes
app.use('/api/billing', protect, adminOnly, billingRoutes)

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Review routes
app.use('/api/reviews', reviewRoutes);

// Order routes
app.use('/api/inventory', orderRoutes);


// Protected check route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

// --- 3. SERVER START & DB CHECK ---
// Changed from app.listen to server.listen to support WebSockets
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  try {
    // 1. Get a connection
    const connection = await User.pool.getConnection();
    console.log("✅ MySQL connection pool is ready");

    // 2. IMPORTANT: Release the connection back to the pool immediately!
    connection.release();
  } catch (error) {
    console.error("❌ Database pool error:", error.message);
  }
});