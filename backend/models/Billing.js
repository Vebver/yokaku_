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
        r.receipt_path,
        t.table_number -- JOINED TABLE NUMBER
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      LEFT JOIN tables t ON r.table_id = t.table_id -- JOIN TABLES
      WHERE r.reservation_id LIKE 'WALK%' OR p.payment_id IS NOT NULL
      ORDER BY r.created_at DESC -- Sort by newest reservation
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  createWalkinPayment: async (reservationId, amount, paymentMethod, paymentStatus = "pending") => {
    try {
      // Logic: Check if payment row already exists for this guest
      const [existing] = await db.execute("SELECT payment_id FROM payments WHERE reservation_id = ?", [reservationId]);
      
      if (existing.length > 0) {
        // UPDATE existing record (Total bill grew)
        const sql = `
          UPDATE payments 
          SET amount = ?, total_bill = ?, payment_method = ?, payment_status = ?, paid_at = NOW() 
          WHERE reservation_id = ?
        `;
        await db.execute(sql, [amount, amount, paymentMethod, paymentStatus, reservationId]);
        return existing[0].payment_id;
      } else {
        // INSERT new record
        const sql = `
          INSERT INTO payments 
          (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await db.execute(sql, [reservationId, amount, amount, paymentMethod, paymentStatus]);
        return result.insertId;
      }
    } catch (err) {
      console.error("Error creating/updating walk-in payment:", err);
      throw err;
    }
  },

  settleReservation: async (resId) => {
    try {
      const sqlRes = "UPDATE reservations SET status = 'completed' WHERE reservation_id = ?";
      await db.execute(sqlRes, [resId]);
      const sqlPay = "UPDATE payments SET payment_status = 'verified', paid_at = NOW() WHERE reservation_id = ?";
      await db.execute(sqlPay, [resId]);
      return true; 
    } catch (err) { throw err; }
  }
};

module.exports = Billing;