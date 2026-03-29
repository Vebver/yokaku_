// controllers/userController.js
const User = require('../models/User'); // Import the class directly

const userController = {
  // 1. GET PROFILE
  async getProfile(req, res) {
    try {
      const userId = req.user.userId; // This is the '7' from your token
      
      // Use the static method you already had
      const user = await User.findById(userId); 
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Map SQL column names to React property names
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

  // 2. UPDATE PROFILE
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const userId = req.user.userId;

      // Call the new update method we added to the User class
      const success = await User.update(userId, { firstName, lastName, email, phone });

      if (!success) {
        return res.status(404).json({ error: "Update failed or user not found" });
      }

      // Fetch the updated data to return to the frontend
      const updatedUser = await User.findById(userId);

      res.json({
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        customerId: `HG-2024-${updatedUser.user_id}`,
        status: "Active Customer"
      });

    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ error: "Failed to update profile in database" });
    }
  }
};

module.exports = userController;