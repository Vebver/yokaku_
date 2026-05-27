const Billing = require("../models/Billing");

exports.getPayments = async (req, res) => {
  try {
    const payments = await Billing.getAll();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.  createWalkinPayment = async (req, res) => {
  try {
    const { reservation_id, amount, payment_method, payment_status } = req.body;
    
    console.log("[Billing Controller] Creating walk-in payment:", { reservation_id, amount, payment_method, payment_status });
    
    if (!reservation_id || amount === undefined || amount === null) {
      return res.status(400).json({ error: "Missing required fields - reservation_id and amount are required" });
    }

    const paymentId = await Billing.createWalkinPayment(
      reservation_id,
      amount,
      payment_method || "Cash",
      payment_status || "pending"
    );

    console.log("[Billing Controller] Payment created with ID:", paymentId);

    res.status(201).json({ 
      success: true, 
      payment_id: paymentId,
      message: "Walk-in payment record created"
    });
  } catch (error) {
    console.error("[Billing Controller] Error creating walk-in payment:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await Billing.updateStatus(id, status);
    if (result) {
      res.json({ message: "Payment status updated successfully" });
    } else {
      res.status(404).json({ error: "Payment not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- NEW CONTROLLER METHOD ---
exports.settleFullBill = async (req, res) => {
  try {
    const { resId } = req.params; // We use the reservation ID to settle the bill
    const result = await Billing.settleReservation(resId);
    
    if (result) {
      res.json({ message: "Bill settled and reservation completed successfully" });
    } else {
      res.status(404).json({ error: "Reservation not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePaymentStatusByReservation = async (req, res) => {
  try {
    const { resId } = req.params;
    // Default to 'verified' if no status is sent in body
    const payment_status = req.body.payment_status || 'verified';

    // Call Model Function 1: Update Payment
    const paymentUpdated = await Billing.updatePaymentStatusByReservation(resId, payment_status);
    
    if (paymentUpdated) {
      // Call Model Function 2: Update Reservation to 'Confirmed'
      await Billing.confirmReservationStatus(resId);

      res.json({ 
        success: true, 
        message: `Payment verified and reservation confirmed.` 
      });
    } else {
      res.status(404).json({ error: "Reservation payment record not found" });
    }
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- NEW CONTROLLER METHOD ---
// Reject payment by reservation id (sets payment_status='rejected' and reservations.status='rejected')
exports.rejectPaymentByReservation = async (req, res) => {
  try {
    const { resId } = req.params;

    const result = await Billing.rejectPaymentByReservation(resId);
    if (result) {
      res.json({ message: "Payment rejected successfully" });
    } else {
      res.status(404).json({ error: "Reservation payment not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
