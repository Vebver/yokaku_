const db = require("../config/db");

const Billing = {
  getAll: async () => {
    const sql = `
      SELECT 
        COALESCE(p.payment_id, -ROW_NUMBER() OVER(ORDER BY r.reservation_id)) as payment_id,
        COALESCE(p.payment_id, 0) as original_payment_id,
        p.amount,
        p.total_bill,
        p.payment_method,
        p.payment_status,
        p.paid_at,
        r.reservation_id,
        r.status,
        r.first_name, 
        r.last_name, 
        r.reservation_date, 
        r.receipt_path
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      WHERE r.reservation_id LIKE 'WALK%' OR p.payment_id IS NOT NULL
      ORDER BY COALESCE(p.paid_at, r.created_at) DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // NEW METHOD: Create payment record for walk-ins
  createWalkinPayment: async (reservationId, amount, paymentMethod, paymentStatus = "pending") => {
    try {
      const sql = `
        INSERT INTO payments 
        (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      const [result] = await db.execute(sql, [
        reservationId, 
        amount, 
        amount, 
        paymentMethod, 
        paymentStatus
      ]);
      return result.insertId;
    } catch (err) {
      console.error("Error creating walk-in payment:", err);
      throw err;
    }
  },

  // NEW METHOD: Updates the Reservation status to 'completed'
  settleReservation: async (resId) => {
    try {
      const sql = "UPDATE reservations SET status = 'completed' WHERE reservation_id = ?";
      const [result] = await db.execute(sql, [resId]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("Error settling reservation:", err);
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    try {
      let sql;
      let params;

      if (status === "verified") {
        sql = "UPDATE payments SET payment_status = ?, paid_at = NOW() WHERE payment_id = ?";
        params = [status, id];
      } else {
        sql = "UPDATE payments SET payment_status = ? WHERE payment_id = ?";
        params = [status, id];
      }

      const [result] = await db.execute(sql, params);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("Error updating billing status:", err);
      throw err;
    }
  },
};

module.exports = Billing;