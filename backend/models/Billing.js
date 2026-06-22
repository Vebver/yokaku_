const db = require("../config/db");

const Billing = {
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
          p.amount,
          p.payment_method,
          p.payment_status,
          p.rejection_reason,
          p.rejected_at,
          r.receipt_path AS receipt_path
        FROM reservations r
        LEFT JOIN payments p ON r.reservation_id = p.reservation_id
        ORDER BY r.reservation_id DESC
      `;
      const [rows] = await db.execute(sql);
      return rows;
    } catch (err) {
      console.error("CRITICAL SQL ERROR:", err.message);
      throw err; 
    }
  },

  createWalkinPayment: async (reservationId, amount, paymentMethod, paymentStatus = "pending") => {
    try {
      const sql = `
        INSERT INTO payments 
          (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          amount = VALUES(amount),
          total_bill = VALUES(total_bill),
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
    await db.execute("UPDATE reservations SET status = 'completed' WHERE reservation_id = ?", [resId]);
    await db.execute(
      "UPDATE payments SET amount = total_bill, payment_status = 'verified', rejection_reason = NULL, rejected_at = NULL WHERE reservation_id = ?", 
      [resId]
    );
    return true;
  },

  updatePaymentStatusByReservation: async (resId, paymentStatus) => {
    try {
      const sql = "UPDATE payments SET payment_status = ? WHERE reservation_id = ?";
      const [result] = await db.execute(sql, [paymentStatus, resId]);
      return result.affectedRows > 0;
    } catch (err) { throw err; }
  },

  confirmReservationStatus: async (resId) => {
    const sql = "UPDATE reservations SET status = 'Confirmed' WHERE reservation_id = ?";
    const [result] = await db.execute(sql, [resId]);
    return result.affectedRows > 0;
  },

  // Reject payment and record rejection metadata
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