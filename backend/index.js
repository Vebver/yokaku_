require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const userController = require("./controllers/userController");
const { protect } = require("./middleware/authMiddleware");
const reservationRoutes = require("./routes/reservationRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");


const PORT = process.env.PORT || 5000;
const app = express();

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

// Reservation routes
app.use("/api/reservations", reservationRoutes);

// Product routes
app.use("/api/products", productRoutes);

// Category routes
app.use("/api/categories", categoryRoutes);

// Inventory routes
app.use("/api/inventory", inventoryRoutes);

// Static folder for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// Protected check route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

// --- 3. SERVER START & DB CHECK ---
app.listen(PORT, async () => {
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
