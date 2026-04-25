const jwt = require('jsonwebtoken');

// 1. PROTECT MIDDLEWARE (Checks if the user is logged in)
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the user info (including role) to the request object
      // decoded contains { userId: ..., role: ... }
      req.user = decoded; 

      return next(); 
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// 2. ADMIN ONLY MIDDLEWARE (Checks if the logged-in user is an admin)
const adminOnly = (req, res, next) => {
  // req.user was created in the 'protect' middleware above
  if (req.user && req.user.role === 'admin') {
    next(); 
  } else {
    res.status(403).json({ error: "Access denied. Admins only." });
  }
};

// 3. EXPORT BOTH
module.exports = { protect, adminOnly };