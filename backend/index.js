require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const userController = require("./controllers/userController");
const { protect, adminOnly } = require("./middleware/authMiddleware");
const reservationRoutes = require("./routes/reservationRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const billingRoutes = require("./routes/billingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
const orderRoutes = require("./routes/orderRoutes");
const startCronJobs = require("./cronJobs");
const Notification = require("./models/Notification");
const settingRoutes = require("./routes/settingRoutes")
const maintenanceController = require("./routes/maitenanceRoutes")

const PORT = process.env.PORT || 5000;
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with better error handling
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Store connected users
const connectedUsers = new Map();

// Set io instance for Notification model
Notification.setIo(io);

// --- SOCKET.IO LOGIC ---
io.on("connection", (socket) => {
  console.log(`📡 New client connected: ${socket.id}`);

  // Handle user joining their personal room
  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`✅ User ${userId} joined their notification room`);
      // Send acknowledgment
      socket.emit("join_ack", { success: true, userId });
    }
  });

  // Listen for orders
  socket.on("send_order", (orderData) => {
    console.log("📦 Order received from kiosk:", orderData.id);
    io.emit("new_order", orderData);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🔌 User ${userId} disconnected`);
        break;
      }
    }
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set("io", io);
app.set("connectedUsers", connectedUsers);

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// --- ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.get("/api/profile", protect, userController.getProfile);
app.put("/api/profile", protect, userController.updateProfile);
app.use("/api/address", addressRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/inventory", protect, adminOnly, inventoryRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/admin", protect, adminOnly, adminRoutes);
app.use("/api/billing", protect, adminOnly, billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inventory", orderRoutes);
app.use("/api/settings", settingRoutes)
app.use("/api/maintenance", maintenanceController)

app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- SERVER START ---
server.listen(PORT, "0.0.0.0", async (error) => {
  if (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }

  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);

  try {
    const connection = await User.pool.getConnection();
    console.log("✅ MySQL connection pool is ready");
    startCronJobs();
    connection.release();
  } catch (error) {
    console.error("❌ Database pool error:", error.message);
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...");
  await User.pool.end();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

module.exports = { io, connectedUsers };
