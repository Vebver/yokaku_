const express = require('express');
const router = express.Router();
// Add settleFullBill to the imports
const { getPayments, updatePaymentStatus, settleFullBill, createWalkinPayment } = require('../controllers/billingController');

router.get('/', getPayments);
router.post('/walkin', createWalkinPayment);
router.put('/:id/status', updatePaymentStatus);
router.put('/settle/:resId', settleFullBill);

module.exports = router;