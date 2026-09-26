const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Serves the kiosk's pre-ordered/refilled items for a reservation
router.get("/reservation-items/:id", orderController.getReservedItems);
router.post("/place", orderController.placeOrder);
router.post("/finish", orderController.finishSession);
router.put("/:id/status", orderController.updateOrderStatus);
router.get("/active", orderController.getActiveOrders); // ← ADD THIS LINE

module.exports = router;
