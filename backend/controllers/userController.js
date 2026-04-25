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

      res.json({
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        profileImage: user.profile_image || null,
        memberSince: user.created_at,
        status:
          user.role === "Admin" ? "System Administrator" : "Active Customer",
        customerId: user.role === "Customer" ? `HG-2024-${user.user_id}` : null,
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
      const { firstName, lastName, email, phone, profileImage } = req.body;

      // --- ADDED: RESTRICTION FOR EXISTING EMAIL ---
      if (email) {
        // Check if any user in the database already uses this email
        const existingUser = await User.findByEmail(email);

        // If an account is found and it doesn't belong to the current user
        if (existingUser && existingUser.user_id !== userId) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }
      // ----------------------------------------------

      const updateData = { firstName, lastName, email, phone, profileImage };

      const success = await User.update(userId, updateData);

      if (!success) return res.status(400).json({ error: "Update failed" });

      const updatedUser = await User.findById(userId);

      res.json({
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        role: updatedUser.role,
        profileImage: updatedUser.profile_image || "",
        memberSince: updatedUser.created_at,
        status:
          updatedUser.role === "Admin" ? "Profile Updated" : "Active Customer",
        customerId:
          updatedUser.role === "Customer"
            ? `HG-2024-${updatedUser.user_id}`
            : null,
      });
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
};

module.exports = userController;
