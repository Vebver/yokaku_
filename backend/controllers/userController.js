const User = require("../models/User");

const userController = {
  // 1. GET PROFILE
  async getProfile(req, res) {
    try {
      const userId = req.user.userId; 
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // We send a consistent object structure
      res.json({
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || "",
        role: user.role, // 'Admin' or 'Customer'
        profileImage: user.profile_image || null,
        memberSince: user.created_at,
        // Dynamic status based on role
        status: user.role === "Admin" ? "System Administrator" : "Active Customer",
        customerId: user.role === "Customer" ? `HG-2024-${user.user_id}` : null
      });
    } catch (error) {
      console.error("Profile Fetch Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // 2. UPDATE PROFILE
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role; // Get role from token

      // 1. Destructure data from React
      const { firstName, lastName, email, phone, profileImage } = req.body;

      // 2. Prepare update object (Role is NOT allowed to be updated here)
      const updateData = { firstName, lastName, email, phone, profileImage };
      
      // 3. Update the database
      const success = await User.update(userId, updateData);

      if (!success) return res.status(400).json({ error: "Update failed" });

      // 4. Fetch fresh data and return to React
      const updatedUser = await User.findById(userId);

      // Return the SAME structure as getProfile for UI consistency
      res.json({
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        role: updatedUser.role,
        profileImage: updatedUser.profile_image || "",
        memberSince: updatedUser.created_at,
        status: updatedUser.role === "Admin" ? "Profile Updated" : "Active Customer",
        customerId: updatedUser.role === "Customer" ? `HG-2024-${updatedUser.user_id}` : null
      });
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
};

module.exports = userController;