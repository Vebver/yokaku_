const Billing = require("../models/Billing");
const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification"); 
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

    console.log("[Billing Controller] Processing walk-in payment request:", {
      reservation_id,
      amount,
      payment_method,
      payment_status,
    });

    if (!reservation_id || amount === undefined || amount === null) {
      return res.status(400).json({
        error: "Missing required fields - reservation_id and amount are required",
      });
    }

    const numericAmount = parseFloat(amount);

    // 1. Check if a payment record already exists for this reservation
    const [existing] = await db.execute(
      "SELECT payment_id, amount FROM payments WHERE reservation_id = ?",
      [reservation_id]
    );

    let paymentId;
    let notificationTitle = "New Walk-in Payment";
    let notificationMessage = "";

    if (existing.length > 0) {
      // --- STACK UP / UPDATE EXISTING PAYMENT ---
      paymentId = existing[0].payment_id;
      const previousAmount = parseFloat(existing[0].amount || 0);
      const addedAmount = numericAmount - previousAmount;

      // Update the existing record with the new cumulative amount
      await db.execute(
        `UPDATE payments 
         SET amount = ?, payment_status = ?, payment_method = ?, paid_at = NOW() 
         WHERE reservation_id = ?`,
        [numericAmount, payment_status || "verified", payment_method || "Cash", reservation_id]
      );

      notificationTitle = "Walk-in Payment Updated";
      if (addedAmount > 0) {
        notificationMessage = `Added ₱${addedAmount} (Total: ₱${numericAmount}) for reservation ${reservation_id}`;
      } else {
        notificationMessage = `Payment updated to ₱${numericAmount} for reservation ${reservation_id}`;
      }

      await logActivity(
        req.user?.userId || null,
        "UPDATE_WALKIN_PAYMENT",
        reservation_id,
        { payment_id: paymentId, added_amount: addedAmount, total_amount: numericAmount, payment_method, payment_status },
        req,
      );
    } else {
      // --- CREATE NEW PAYMENT RECORD ---
      paymentId = await Billing.createWalkinPayment(
        reservation_id,
        numericAmount,
        payment_method || "Cash",
        payment_status || "Pending",
      );

      notificationMessage = `Payment of ₱${numericAmount} created for reservation ${reservation_id}`;

      await logActivity(
        req.user?.userId || null,
        "CREATE_WALKIN_PAYMENT",
        reservation_id,
        { payment_id: paymentId, amount: numericAmount, payment_method, payment_status },
        req,
      );
    }

    // Emit consolidated socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("new_notification", {
        title: notificationTitle,
        message: notificationMessage,
        type: "payment",
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    console.log("[Billing Controller] Payment process completed for ID:", paymentId);

    res.status(201).json({
      success: true,
      payment_id: paymentId,
      message: existing.length > 0 ? "Walk-in payment record updated" : "Walk-in payment record created",
    });
  } catch (error) {
    console.error("[Billing Controller] Error in createWalkinPayment:", error);
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

      // Emit socket event for payment status update
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

      // Emit socket event for bill settlement
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
          
          // 1. Strictly for Customer (isAdminAlert: false)
          await Notification.create(db, {
            userId: user_id,
            reservationId: null, 
            title: "Payment Verified",
            message: `Your proof of payment for reservation ${resId} has been successfully verified! Your booking on ${r_date} at ${r_time} is officially confirmed.`,
            type: "success",
            isAdminAlert: false,
          });

          // 2. Strictly for Admin (isAdminAlert: true)
          await Notification.create(db, {
            userId: null,
            reservationId: null, 
            title: "Payment Verified",
            message: `Payment for reservation ${resId} has been verified and confirmed.`,
            type: "success",
            isAdminAlert: true, 
          });
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
        
        // 1. Strictly for Customer (isAdminAlert: false)
        await Notification.create(db, {
          userId: userId,
          reservationId: null, 
          title: "Payment Proof Rejected",
          message: `Your proof of payment was rejected for reservation ${resId}. Reason: ${finalReason}. Please upload a valid proof within 12 hours.`,
          type: "warning",
          isAdminAlert: false, 
        });

        // 2. Strictly for Admin (isAdminAlert: true)
        await Notification.create(db, {
          userId: null,
          reservationId: null, 
          title: "Payment Proof Rejected",
          message: `Payment for reservation ${resId} was rejected. Reason: ${finalReason}`,
          type: "warning",
          isAdminAlert: true, 
        });
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
      return res.status(400).json({ error: "Please upload a valid receipt image." });
    }

    await db.execute(
      "UPDATE reservations SET receipt_path = ? WHERE reservation_id = ?",
      [receiptPath, resId]
    );

    await db.execute(
      "UPDATE payments SET payment_status = 'pending' WHERE reservation_id = ?",
      [resId]
    );

    await db.execute(
      "UPDATE reservations SET status = 'Pending' WHERE reservation_id = ?",
      [resId]
    );

    try {
      const notifMessage = `Customer re-uploaded a new proof of payment for reservation ${resId}. Please review it in your Billing portal.`;

      // Strictly for Admins & Managers - set to true so it replicates
      await Notification.create(db, {
        userId: null,
        reservationId: null, 
        title: "New Proof Uploaded",
        message: notifMessage,
        type: "info",
        isAdminAlert: true, 
      });
    } catch (adminNotifErr) {
      console.warn("Non-blocking Admin Notification on reupload failed:", adminNotifErr.message);
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

    // Emit socket event
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