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
const settingRoutes = require("./routes/settingRoutes");

const PORT = process.env.PORT || 5000;
const app = express();

// --- CORS CONFIGURATION ---
// Added 4173 (Vite Preview) to the allowed origins
const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173", 
  "http://localhost:4173", 
  "http://127.0.0.1:4173"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// --------------------------

const server = http.createServer(app);

// Initialize Socket.io with updated allowed origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

const connectedUsers = new Map();
Notification.setIo(io);

io.on("connection", (socket) => {
  console.log(`📡 New client connected: ${socket.id}`);
  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`✅ User ${userId} joined room`);
      socket.emit("join_ack", { success: true, userId });
    }
  });
  socket.on("send_order", (orderData) => {
    io.emit("new_order", orderData);
  });
  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

app.set("io", io);
app.set("connectedUsers", connectedUsers);

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

// FIXED: Static files now use CORS so the Service Worker can cache images
app.use("/uploads", cors(corsOptions), express.static(path.join(__dirname, "uploads")));

app.use("/api/admin", adminRoutes);
app.use("/api/billing", protect, adminOnly, billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

server.listen(PORT, "0.0.0.0", async (error) => {
  if (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    const connection = await User.pool.getConnection();
    console.log("✅ MySQL connection pool is ready");
    startCronJobs();
    connection.release();
  } catch (error) {
    console.error("❌ Database pool error:", error.message);
  }
});

process.on("SIGINT", async () => {
  await User.pool.end();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { io, connectedUsers };