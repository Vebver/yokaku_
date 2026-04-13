const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const upload = require('../middleware/upload'); 

// 1. GET routes
router.get('/', reservationController.getReservations);
router.get('/check-availability', reservationController.checkAvailability);

// --- ADD THESE TWO NEW ROUTES ---
router.get('/user-active/:userId', reservationController.checkUserActive);
router.get('/table-statuses', reservationController.getTableStatuses);

// 2. POST routes
router.post('/table', upload.single('receipt'), reservationController.createReservation);

// 3. Generic /:id routes (KEEP THESE LAST)
router.get("/:id", reservationController.checkReservationId); 
router.put('/:id/status', reservationController.updateStatus);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;