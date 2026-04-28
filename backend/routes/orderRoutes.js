// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Define your routes using the object methods
router.get('/reservation-items/:id', orderController.getReservedItems);
router.post('/place', orderController.placeOrder);

module.exports = router;