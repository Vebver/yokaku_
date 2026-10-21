const express = require("express");
const router = express.Router();
const settingController = require("../controllers/settingController");
const upload = require("../middleware/exclusiveOfferUpload"); // The new upload middleware
const { protect, adminOnly } = require("../middleware/authMiddleware"); // Adjust based on your auth middleware

router.get("/", settingController.getSettings);
router.put("/", protect, adminOnly, settingController.updateSettings);

// NEW ROUTES
router.post(
  "/exclusive-offers",
  protect,
  adminOnly,
  upload.single("image"),
  settingController.uploadExclusiveOffer,
);
router.delete(
  "/exclusive-offers/:id",
  protect,
  adminOnly,
  settingController.deleteExclusiveOffer,
);

module.exports = router;
