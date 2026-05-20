const Billing = require("../models/Billing");

exports.getPayments = async (req, res) => {
  try {
    const payments = await Billing.getAll();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createWalkinPayment = async (req, res) => {
  try {
    const { reservation_id, amount, payment_method, payment_status } = req.body;
    
    if (!reservation_id || amount === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentId = await Billing.createWalkinPayment(
      reservation_id,
      amount,
      payment_method || "Cash",
      payment_status || "pending"
    );

    res.status(201).json({ 
      success: true, 
      payment_id: paymentId,
      message: "Walk-in payment record created"
    });
  } catch (error) {
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