const Billing = require("../models/Billing");
const db = require("../config/db"); // Needed for the safe notification writing

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

exports.settleFullBill = async (req, res) => {
  try {
    const { resId } = req.params; 
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

// PUT: Verify Payment and Notify Customer
exports.updatePaymentStatusByReservation = async (req, res) => {
  try {
    const { resId } = req.params;
    const payment_status = req.body.payment_status || 'verified';

    // 1. Update Payment Status in Database
    const paymentUpdated = await Billing.updatePaymentStatusByReservation(resId, payment_status);
    
    if (paymentUpdated) {
      // 2. Set Reservation status to 'Confirmed'
      await Billing.confirmReservationStatus(resId);

      // 3. Write Notification and Emit Real-Time Socket Event to the Customer
      try {
        // Fetch the customer's user_id and reservation details
        const [rows] = await db.execute(
          `SELECT user_id, 
                  DATE_FORMAT(reservation_date, '%Y-%m-%d') as r_date, 
                  TIME_FORMAT(reservation_time, '%h:%i %p') as r_time 
           FROM reservations WHERE reservation_id = ?`,
          [resId]
        );

        if (rows.length > 0) {
          const { user_id, r_date, r_time } = rows[0];
          const notifMessage = `Your proof of payment for reservation ${resId} has been successfully verified! Your booking on ${r_date} at ${r_time} is officially confirmed.`;

          // Write notification record for the customer
          const [notifResult] = await db.execute(
            `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
             VALUES (?, ?, 'Payment Verified', ?, 0, NOW())`,
            [user_id, resId, notifMessage]
          );

          // Emit real-time update to Customer's connected client
          const io = req.app.get("socketio");
          if (io) {
            io.to(user_id.toString()).emit("new_notification", {
              notification_id: notifResult.insertId,
              user_id: user_id,
              reservation_id: resId,
              title: "Payment Verified",
              message: notifMessage,
              is_read: 0,
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (notifErr) {
        console.warn("Non-blocking Verification Notification Error:", notifErr.message);
      }

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

// PUT: Reject Payment by Reservation ID & Notify Customer Real-time
exports.rejectPaymentByReservation = async (req, res) => {
  try {
    const { resId } = req.params; // Extracts from route parameter /reject/:resId
    const { reason } = req.body;  // Extracts from React request payload

    const finalReason = reason ? reason.trim() : "Invalid proof of payment. Please re-upload within 12 hours.";

    // 1. Update status, reason, and rejection timestamp in database
    const result = await Billing.rejectPaymentByReservation(resId, finalReason);
    
    if (result) {
      // 2. Fetch the user_id associated with this reservation so we can target the notification
      const [reservationRows] = await db.execute(
        "SELECT user_id FROM reservations WHERE reservation_id = ?",
        [resId]
      );

      if (reservationRows.length > 0) {
        const userId = reservationRows[0].user_id;
        const notifMessage = `Your proof of payment was rejected. Reason: ${finalReason}. Please upload a valid proof within 12 hours.`;

        // 3. Write database record (including BOTH user_id and reservation_id)
        const [notifResult] = await db.execute(
          `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
           VALUES (?, ?, 'Payment Proof Rejected', ?, 0, NOW())`,
          [userId, resId, notifMessage]
        );

        const newNotificationId = notifResult.insertId;

        // 4. Emit the Live Socket Event to the user's connected clients & admin
        const io = req.app.get("socketio"); // Retrieve the Socket.io instance from Express
        if (io) {
          const notificationPayload = {
            notification_id: newNotificationId,
            user_id: userId,
            reservation_id: resId,
            title: "Payment Proof Rejected",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString()
          };

          // Emit to the specific user's socket room (joined via "join_user")
          io.to(userId.toString()).emit("new_notification", notificationPayload);
          
          // Emit globally so the active administrator's notifications list updates live
          io.emit("new_notification", notificationPayload);
        }
      }

      return res.status(200).json({ message: "Payment rejected successfully." });
    } else {
      return res.status(404).json({ error: "Reservation payment record not found" });
    }
  } catch (error) {
    console.error("SQL/Rejection controller error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// PUT: Process receipt re-upload, reset statuses, and notify admin
exports.reuploadPaymentProof = async (req, res) => {
  try {
    const { resId } = req.params;
    
    const receiptPath = req.file ? (req.file.path || req.file.filename) : null;

    if (!receiptPath) {
      return res.status(400).json({ error: "Please upload a valid receipt image." });
    }

    // 1. Update the receipt path
    await db.execute(
      "UPDATE reservations SET receipt_path = ? WHERE reservation_id = ?",
      [receiptPath, resId]
    );

    // 2. Set the payment status back to 'pending'
    await db.execute(
      "UPDATE payments SET payment_status = 'pending' WHERE reservation_id = ?",
      [resId]
    );

    // 3. Set the reservation status back to 'Pending'
    await db.execute(
      "UPDATE reservations SET status = 'Pending' WHERE reservation_id = ?",
      [resId]
    );

    // 4. Notify all Administrators of the re-uploaded proof
    try {
      const [admins] = await db.execute("SELECT user_id FROM users WHERE role = 'admin'");
      const notifMessage = `Customer re-uploaded a new proof of payment for reservation ${resId}. Please review it in your Billing portal.`;
      const io = req.app.get("socketio");

      for (const admin of admins) {
        const [notifResult] = await db.execute(
          `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
           VALUES (?, ?, 'New Proof Uploaded', ?, 0, NOW())`,
          [admin.user_id, resId, notifMessage]
        );

        if (io) {
          io.to(admin.user_id.toString()).emit("new_notification", {
            notification_id: notifResult.insertId,
            user_id: admin.user_id,
            reservation_id: resId,
            title: "New Proof Uploaded",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (adminNotifErr) {
      console.warn("Non-blocking Admin Notification on reupload failed:", adminNotifErr.message);
    }

    return res.status(200).json({ 
      success: true, 
      message: "Proof of payment successfully updated." 
    });
  } catch (error) {
    console.error("Error in reuploadPaymentProof:", error);
    return res.status(500).json({ error: error.message });
  }
};
// PUT: Update downpayment amount manually by admin
exports.updatePaymentAmount = async (req, res) => {
  const { resId } = req.params;
  const { amount } = req.body;

  if (amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid amount provided." });
  }

  try {
    const sql = "UPDATE payments SET amount = ? WHERE reservation_id = ?";
    const [result] = await db.execute(sql, [amount, resId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    return res.status(200).json({ success: true, message: "Downpayment amount updated successfully." });
  } catch (err) {
    console.error("SQL Error in updatePaymentAmount:", err.message);
    return res.status(500).json({ error: "Failed to update payment amount." });
  }
};

exports.updatePaymentAmount = async (req, res) => {
  const { resId } = req.params;
  const { amount } = req.body;

  if (amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid amount provided." });
  }

  try {
    const sql = "UPDATE payments SET amount = ? WHERE reservation_id = ?";
    const [result] = await db.execute(sql, [amount, resId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    return res.status(200).json({ success: true, message: "Downpayment amount updated successfully." });
  } catch (err) {
    console.error("SQL Error in updatePaymentAmount:", err.message);
    return res.status(500).json({ error: "Failed to update payment amount." });
  }
};