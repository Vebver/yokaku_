// controllers/userController.js
const User = require("../models/User"); // Import the class directly

const userController = {
  // 1. GET PROFILE
  async getProfile(req, res) {
    try {
      const userId = req.user.userId; // This is the '7' from your token

      // Use the static method you already had
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Map SQL column names to React property names
      res.json({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || "N/A",
        profileImage: user.profile_image || null, // New field
        customerId: `HG-2024-${user.user_id}`,
        status: "Active Customer",
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
    
    // 1. Destructure the data from React
    const { firstName, lastName, email, phone, profileImage } = req.body;

    // 2. Pass the data as an OBJECT to the model
    const success = await User.update(userId, { 
      firstName, 
      lastName, 
      email, 
      phone, 
      profileImage 
    });

    if (!success) return res.status(404).json({ error: "Update failed" });

    // 3. Fetch fresh data and return to React
    const updatedUser = await User.findById(userId);
    res.json({
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      profileImage: updatedUser.profile_image || '',
      customerId: `HG-2024-${updatedUser.user_id}`,
      status: "Active Customer"
    });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
}
};

module.exports = userController;
