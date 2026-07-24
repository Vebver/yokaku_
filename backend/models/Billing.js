// models/Billing.js
const db = require("../config/db");

const Billing = {
  // 1. Get all rows with table numbers (Updated to select total_bill)
  getAll: async () => {
    try {
      const sql = `
        SELECT 
          r.reservation_id,
          r.first_name,
          r.last_name,
          r.status as order_status,
          r.reservation_date,
          p.payment_id,
          p.amount,              -- Amount currently paid / deposit
          p.total_bill,          -- The ACTUAL calculated bill (Added)
          p.payment_method,
          p.payment_status,
          p.rejection_reason,
          p.rejected_at,
          r.receipt_path AS receipt_path,
          GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ', ') AS table_number
        FROM reservations r
        LEFT JOIN payments p ON r.reservation_id = p.reservation_id
        LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        LEFT JOIN tables t ON rt.table_id = t.table_id
        GROUP BY r.reservation_id, p.payment_id
        ORDER BY r.reservation_id DESC
      `;
      const [rows] = await db.execute(sql);
      return rows;
    } catch (err) {
      console.error("CRITICAL SQL ERROR:", err.message);
      throw err; 
    }
  },

  // 2. Prevent duplicate updates from downgrading the total_bill
  createWalkinPayment: async (reservationId, amount, paymentMethod, paymentStatus = "pending") => {
    try {
      const sql = `
        INSERT INTO payments 
          (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          amount = VALUES(amount),
          -- Keeps the highest calculated bill to prevent overwriting kiosk sync calculations (Fixed)
          total_bill = GREATEST(COALESCE(total_bill, 0), VALUES(total_bill)), 
          payment_status = VALUES(payment_status),
          payment_method = VALUES(payment_method),
          paid_at = NOW()
      `;
      
      const [result] = await db.execute(sql, [
        reservationId, 
        amount, 
        amount, 
        paymentMethod, 
        paymentStatus
      ]);
      
      return result.insertId || result.affectedRows;
    } catch (err) {
      console.error("Error in createWalkinPayment:", err.message);
      throw err;
    }
  },

  settleReservation: async (resId) => {
    // Mark reservation as completed
    await db.execute("UPDATE reservations SET status = 'completed' WHERE reservation_id = ?", [resId]);
    
    // Set paid_at to NOW() if it is currently NULL, so it registers in reports (Fixed)
    await db.execute(
      `UPDATE payments 
       SET amount = total_bill, 
           payment_status = 'verified', 
           rejection_reason = NULL, 
           rejected_at = NULL,
           paid_at = COALESCE(paid_at, NOW()) 
       WHERE reservation_id = ?`, 
      [resId]
    );
    return true;
  },

  updatePaymentStatusByReservation: async (resId, paymentStatus) => {
    try {
      // Automatically assign paid_at timestamp if setting status to 'verified' (Fixed)
      const sql = `
        UPDATE payments 
        SET payment_status = ?,
            paid_at = CASE WHEN ? = 'verified' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
        WHERE reservation_id = ?`;
      const [result] = await db.execute(sql, [paymentStatus, paymentStatus, resId]);
      return result.affectedRows > 0;
    } catch (err) { 
      throw err; 
    }
  },

  confirmReservationStatus: async (resId) => {
    const sql = "UPDATE reservations SET status = 'Confirmed' WHERE reservation_id = ?";
    const [result] = await db.execute(sql, [resId]);
    return result.affectedRows > 0;
  },

  rejectPaymentByReservation: async (resId, reason) => {
    try {
      await db.execute(
        "UPDATE payments SET payment_status = 'rejected', rejection_reason = ?, rejected_at = NOW() WHERE reservation_id = ?", 
        [reason || null, resId]
      );
      
      const [result] = await db.execute(
        "UPDATE reservations SET status = 'rejected' WHERE reservation_id = ?", 
        [resId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  }
};

module.exports = Billing;