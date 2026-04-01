const Reservation = require('../models/Reservation');

exports.createReservation = (req, res) => {
  // 1. [TEST] Immediate Response to React
  console.log("📥 [TEST] Request received! Sending response back to React NOW.");
  res.status(200).json({ success: true, message: "Wait for approval! Reservation submitted." });

  // 2. BACKGROUND WORK
  // We do NOT use 'await' before the response so the user doesn't wait
  Reservation.create(req.body)
    .then(() => {
      console.log("✅ DB Background Success!");
    })
    .catch((err) => {
      console.error("❌ DB Background Error:", err.message);
    });
};