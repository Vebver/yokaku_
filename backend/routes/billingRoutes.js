const express = require('express');
const router = express.Router();
// FIX: Ensure the import is complete and matches the controller
const { 
    getPayments, 
    updatePaymentStatus, 
    settleFullBill, 
    createWalkinPayment // <--- Make sure this isn't cut off
} = require('../controllers/billingController'); 

// If your index.js protects this whole file, /walkin will fail for guests.
router.get('/', getPayments);
router.post('/walkin', createWalkinPayment); 
router.put('/:id/status', updatePaymentStatus);
router.put('/settle/:resId', settleFullBill);

module.exports = router;