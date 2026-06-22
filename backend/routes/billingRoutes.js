const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/receiptUploadCloudinary')


const { 
    getPayments, 
    updatePaymentStatus, 
    settleFullBill,
    updatePaymentStatusByReservation,
    createWalkinPayment, 
    rejectPaymentByReservation,
    reuploadPaymentProof,
    updatePaymentAmount
} = require('../controllers/billingController');

router.get('/', protect, adminOnly, getPayments);
router.post('/walkin', createWalkinPayment); 
router.put('/verify/:resId', updatePaymentStatusByReservation); 
router.put('/:id/status', updatePaymentStatus);
router.put('/settle/:resId', protect, adminOnly, settleFullBill);
router.put('/payment-status/:resId', updatePaymentStatusByReservation);
router.put('/reject/:resId', protect, adminOnly, rejectPaymentByReservation);
router.put('/reupload-proof/:resId', upload.single('receipt'), reuploadPaymentProof);
router.put('/update-amount/:resId', protect, updatePaymentAmount);

module.exports = router;