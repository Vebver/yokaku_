const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

router.get('/', reservationController.getReservations);
router.post('/', reservationController.createReservation);
router.put('/:id/status', reservationController.updateStatus);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;