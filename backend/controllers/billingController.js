const Billing = require("../models/Billing");
const Reservation = require("../models/Reservation");
const { logActivity } = require("../utils/logger");
const db = require("../config/db");

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

    console.log("[Billing Controller] Creating walk-in payment:", {
      reservation_id,
      amount,
      payment_method,
      payment_status,
    });

    if (!reservation_id || amount === undefined || amount === null) {
      return res
        .status(400)
        .json({
          error:
            "Missing required fields - reservation_id and amount are required",
        });
    }

    const paymentId = await Billing.createWalkinPayment(
      reservation_id,
      amount,
      payment_method || "Cash",
      payment_status || "Pending",
    );

    await logActivity(
      req.user?.userId || null,
      "CREATE_WALKIN_PAYMENT",
      reservation_id,
      { payment_id: paymentId, amount, payment_method, payment_status },
      req,
    );

    // FIX: Emit socket event for new payment
    const io = req.app.get("io");
    if (io) {
      io.emit("new_notification", {
        title: "New Walk-in Payment",
        message: `Payment of ₱${amount} created for reservation ${reservation_id}`,
        type: "payment",
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    console.log("[Billing Controller] Payment created with ID:", paymentId);

    res.status(201).json({
      success: true,
      payment_id: paymentId,
      message: "Walk-in payment record created",
    });
  } catch (error) {
    console.error(
      "[Billing Controller] Error creating walk-in payment:",
      error,
    );
    res.status(500).json({ error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await Billing.updateStatus(id, status);

    if (result) {
      await logActivity(
        req.user?.userId || null,
        "UPDATE_PAYMENT_STATUS",
        id,
        { status },
        req,
      );

      // FIX: Emit socket event for payment status update
      const io = req.app.get("io");
      if (io) {
        io.emit("new_notification", {
          title: "Payment Status Updated",
          message: `Payment ${id} status changed to ${status}`,
          type: "payment",
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      }

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
      await logActivity(
        req.user?.userId || null,
        "SETTLE_BILL_COMPLETED",
        resId,
        { message: "Transaction fully paid and marked completed" },
        req,
      );

      // FIX: Emit socket event for bill settlement
      const io = req.app.get("io");
      if (io) {
        io.emit("new_notification", {
          title: "Bill Settled",
          message: `Bill for reservation ${resId} has been fully paid and completed`,
          type: "payment",
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      }

      res.json({
        message: "Bill settled and reservation completed successfully",
      });
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
    const payment_status = req.body.payment_status || "verified";

    const paymentUpdated = await Billing.updatePaymentStatusByReservation(
      resId,
      payment_status,
    );

    if (paymentUpdated) {
      await Reservation.updateStatus(resId, "Confirmed");

      await logActivity(
        req.user?.userId || null,
        "VERIFY_PAYMENT_PROOF",
        resId,
        { status: payment_status },
        req,
      );

      try {
        const [rows] = await db.execute(
          `SELECT user_id, 
                  DATE_FORMAT(reservation_date, '%Y-%m-%d') as r_date, 
                  TIME_FORMAT(reservation_time, '%h:%i %p') as r_time 
           FROM reservations WHERE reservation_id = ?`,
          [resId],
        );

        if (rows.length > 0) {
          const { user_id, r_date, r_time } = rows[0];
          const notifMessage = `Your proof of payment for reservation ${resId} has been successfully verified! Your booking on ${r_date} at ${r_time} is officially confirmed.`;

          const [notifResult] = await db.execute(
            `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
             VALUES (?, ?, 'Payment Verified', ?, 0, NOW())`,
            [user_id, resId, notifMessage],
          );

          // FIX: Use correct socket instance and emit to both user and admin
          const io = req.app.get("io");
          if (io) {
            // Emit to specific user
            io.to(`user_${user_id}`).emit("new_notification", {
              notification_id: notifResult.insertId,
              user_id: user_id,
              reservation_id: resId,
              title: "Payment Verified",
              message: notifMessage,
              is_read: 0,
              created_at: new Date().toISOString(),
            });

            // Emit globally for admin
            io.emit("new_notification", {
              title: "Payment Verified",
              message: `Payment for reservation ${resId} has been verified and confirmed`,
              type: "payment_verified",
              is_read: 0,
              created_at: new Date().toISOString(),
            });
          }
        }
      } catch (notifErr) {
        console.warn(
          "Non-blocking Verification Notification Error:",
          notifErr.message,
        );
      }

      res.json({
        success: true,
        message: `Payment verified and reservation confirmed.`,
      });
    } else {
      res.status(404).json({ error: "Reservation payment record not found" });
    }
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.rejectPaymentByReservation = async (req, res) => {
  try {
    const { resId } = req.params;
    const { reason } = req.body;

    const finalReason = reason
      ? reason.trim()
      : "Invalid proof of payment. Please re-upload within 12 hours.";

    const result = await Billing.rejectPaymentByReservation(resId, finalReason);

    if (result) {
      await logActivity(
        req.user?.userId || null,
        "REJECTED_PAYMENT_PROOF",
        resId,
        { reason: finalReason },
        req,
      );

      const [reservationRows] = await db.execute(
        "SELECT user_id FROM reservations WHERE reservation_id = ?",
        [resId],
      );

      if (reservationRows.length > 0) {
        const userId = reservationRows[0].user_id;
        const notifMessage = `Your proof of payment was rejected. Reason: ${finalReason}. Please upload a valid proof within 12 hours.`;

        const [notifResult] = await db.execute(
          `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
           VALUES (?, ?, 'Payment Proof Rejected', ?, 0, NOW())`,
          [userId, resId, notifMessage],
        );

        const newNotificationId = notifResult.insertId;

        // FIX: Use correct socket instance
        const io = req.app.get("io");
        if (io) {
          const notificationPayload = {
            notification_id: newNotificationId,
            user_id: userId,
            reservation_id: resId,
            title: "Payment Proof Rejected",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString(),
          };

          io.to(`user_${userId}`).emit("new_notification", notificationPayload);
          io.emit("new_notification", {
            title: "Payment Rejected",
            message: `Payment for reservation ${resId} was rejected. Reason: ${finalReason}`,
            type: "payment_rejected",
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Payment rejected successfully." });
    } else {
      return res
        .status(404)
        .json({ error: "Reservation payment record not found" });
    }
  } catch (error) {
    console.error("SQL/Rejection controller error:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.reuploadPaymentProof = async (req, res) => {
  try {
    const { resId } = req.params;
    const receiptPath = req.file ? req.file.path || req.file.filename : null;

    if (!receiptPath) {
      return res
        .status(400)
        .json({ error: "Please upload a valid receipt image." });
    }

    await db.execute(
      "UPDATE reservations SET receipt_path = ? WHERE reservation_id = ?",
      [receiptPath, resId],
    );

    await db.execute(
      "UPDATE payments SET payment_status = 'pending' WHERE reservation_id = ?",
      [resId],
    );

    await db.execute(
      "UPDATE reservations SET status = 'Pending' WHERE reservation_id = ?",
      [resId],
    );

    try {
      const [admins] = await db.execute(
        "SELECT user_id FROM users WHERE role = 'admin'",
      );
      const notifMessage = `Customer re-uploaded a new proof of payment for reservation ${resId}. Please review it in your Billing portal.`;
      const io = req.app.get("io");

      for (const admin of admins) {
        const [notifResult] = await db.execute(
          `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
           VALUES (?, ?, 'New Proof Uploaded', ?, 0, NOW())`,
          [admin.user_id, resId, notifMessage],
        );

        if (io) {
          io.to(`user_${admin.user_id}`).emit("new_notification", {
            notification_id: notifResult.insertId,
            user_id: admin.user_id,
            reservation_id: resId,
            title: "New Proof Uploaded",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        }
      }

      // FIX: Also emit globally for admin dashboard
      const io = req.app.get("io");
      if (io) {
        io.emit("new_notification", {
          title: "Payment Proof Re-uploaded",
          message: `Customer re-uploaded proof of payment for reservation ${resId}`,
          type: "payment_reupload",
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (adminNotifErr) {
      console.warn(
        "Non-blocking Admin Notification on reupload failed:",
        adminNotifErr.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Proof of payment successfully updated.",
    });
  } catch (error) {
    console.error("Error in reuploadPaymentProof:", error);
    return res.status(500).json({ error: error.message });
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

    await logActivity(
      req.user?.userId || null,
      "UPDATE_PAYMENT_AMOUNT",
      resId,
      { amount: Number(amount) },
      req,
    );

    // FIX: Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("new_notification", {
        title: "Payment Amount Updated",
        message: `Downpayment amount for reservation ${resId} updated to ₱${amount}`,
        type: "payment",
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Downpayment amount updated successfully.",
      });
  } catch (err) {
    console.error("SQL Error in updatePaymentAmount:", err.message);
    return res.status(500).json({ error: "Failed to update payment amount." });
  }
};
