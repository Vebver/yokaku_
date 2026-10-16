const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const eventTakeoutController = require("../controllers/eventTakeoutController");
const { protect, eventTakeoutAccess } = require("../middleware/authMiddleware");

// Serves the kiosk's pre-ordered/refilled items for a reservation
router.get("/reservation-items/:id", orderController.getReservedItems);
router.post("/place", orderController.placeOrder);
router.post("/finish", orderController.finishSession);
router.put("/:id/status", orderController.updateOrderStatus);
router.get("/active", orderController.getActiveOrders); // ← ADD THIS LINE
router.get(
	"/event-takeouts/active",
	protect,
	eventTakeoutAccess,
	eventTakeoutController.getActiveRequests,
);
router.put(
	"/event-takeouts/:id/status",
	protect,
	eventTakeoutAccess,
	eventTakeoutController.updateStatus,
);

module.exports = router;
