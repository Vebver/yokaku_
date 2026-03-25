// controllers/userController.js
const User = require('../models/User');

const userController = {
  // Use this for your Customer Profile page
  async getProfile(req, res) {
    try {
      // 1. req.user.userId comes from your Auth Middleware (from the JWT)
      // This ensures a user can ONLY see their own profile
      const user = await User.findById(req.user.userId); 
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 2. Map Database names (first_name) to React names (firstName)
      // This matches your React code: userData.firstName
      res.json({
        firstName: user.first_name, 
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || 'N/A',
        customerId: `HG-2024-${user.user_id}`, 
        status: "Active Customer"
      });

    } catch (error) {
      console.error("Profile Fetch Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Use this if you need to update profile info later
  async updateProfile(req, res) {
     // logic for updating user info
  }
};

module.exports = userController;