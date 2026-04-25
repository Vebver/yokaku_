const express = require('express');
const router = express.Router();
const { getPayments, updatePaymentStatus } = require('../controllers/billingController');

router.get('/', getPayments);
router.put('/:id/status', updatePaymentStatus);

module.exports = router;