const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/", announcementController.getPublished);
router.get("/admin", protect, adminOnly, announcementController.getAll);
router.post("/", protect, adminOnly, upload.single("image"), announcementController.create);
router.put("/:id", protect, adminOnly, upload.single("image"), announcementController.update);
router.delete("/:id", protect, adminOnly, announcementController.delete);

module.exports = router;
