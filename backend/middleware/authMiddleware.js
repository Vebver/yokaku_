const jwt = require("jsonwebtoken");

// 1. PROTECT MIDDLEWARE (Remains the same)
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "Internal Server Error" });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // This contains userId and role
      return next();
    } catch (error) {
      const errorMessage = error.name === "TokenExpiredError" ? "Session expired" : "Not authorized";
      return res.status(401).json({ error: errorMessage });
    }
  }
  if (!token) return res.status(401).json({ error: "No token provided" });
};

// 2. UPDATED MIDDLEWARE: Now allows Admin AND Staff/Cashier
const adminOnly = (req, res, next) => {
  // Check for admin OR staff OR cashier roles
  const allowedRoles = ["admin", "staff", "cashier"];
  
  if (req.user && allowedRoles.includes(req.user.role)) {
    next();
  } else {
    console.log("Access Denied for role:", req.user?.role); // Debug log
    res.status(403).json({ error: "Access denied. Admins or Staff only." });
  }
};

// 3. KIOSK CONTROL: only Admin and Cashier/Staff may interrupt or stop a
//    kiosk session (e.g. when the kiosk is stuck or showing a bug).
const kioskControl = (req, res, next) => {
  const allowedRoles = ["admin", "cashier", "staff"];
  const role = req.user?.role;

  if (role && allowedRoles.includes(role)) {
    return next();
  }

  console.log("Kiosk control denied for role:", role);
  res.status(403).json({
    error: "Access denied. Only admins or cashiers can control the kiosk.",
  });
};

module.exports = { protect, adminOnly, kioskControl };