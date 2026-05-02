const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/reservation-items/:id', orderController.getReservedItems);
router.post('/place', orderController.placeOrder);
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;