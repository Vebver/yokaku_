const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// 1. Specific routes first
router.get('/', reservationController.getReservations);
router.post('/table', reservationController.createReservation); // Move this UP

// 2. Generic ID routes last
router.get("/:id", reservationController.checkReservationId); // This catches anything after /
router.post('/', reservationController.createReservation);
router.put('/:id/status', reservationController.updateStatus);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;