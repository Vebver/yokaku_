const jwt = require("jsonwebtoken");

// 1. PROTECT MIDDLEWARE (Checks if the user is logged in)
const protect = (req, res, next) => {
  let token;

  // Check if the Authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get the token from the header
      token = req.headers.authorization.split(" ")[1];

      // Check if JWT_SECRET exists in .env to prevent server crashes
      if (!process.env.JWT_SECRET) {
        console.error(
          "FATAL ERROR: JWT_SECRET is not defined in the .env file.",
        );
        return res
          .status(500)
          .json({ error: "Internal Server Configuration Error" });
      }

      // Verify the token using the secret from .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the decoded user info (userId, role) to the request object
      req.user = decoded;

      return next();
    } catch (error) {
      // Send a more specific message if the token is expired
      const errorMessage =
        error.name === "TokenExpiredError"
          ? "Session expired, please login again"
          : "Not authorized, token invalid";

      return res.status(401).json({ error: errorMessage });
    }
  }

  // If no token was found in the header
  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token provided" });
  }
};

// 2. ADMIN ONLY MIDDLEWARE (Checks if the logged-in user is an admin)
const adminOnly = (req, res, next) => {
  // req.user was created in the 'protect' middleware above
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admins only." });
  }
};

// 3. EXPORT BOTH
module.exports = { protect, adminOnly };
