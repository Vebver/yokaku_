const Billing = require("../models/Billing");

exports.getPayments = async (req, res) => {
  try {
    const payments = await Billing.getAll();
    res.json(payments);
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
