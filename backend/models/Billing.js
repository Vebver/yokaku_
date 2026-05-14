const db = require("../config/db");

const Billing = {
  getAll: async () => {
    const sql = `
      SELECT 
        p.*,
        r.status,          -- This allows us to see if it is 'confirmed', 'seated', etc.
        r.first_name, 
        r.last_name, 
        r.reservation_date, 
        r.receipt_path
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.reservation_id
      ORDER BY p.paid_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
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