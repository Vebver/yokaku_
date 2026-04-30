const db = require("../config/db");

const Billing = {
  getAll: async () => {
    const sql = `
      SELECT 
        p.*, 
        r.first_name, 
        r.last_name, 
        r.reservation_date, 
        REPLACE(r.receipt_path, '/uploads/', '') AS receipt_path 
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.reservation_id
      ORDER BY p.paid_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  updateStatus: async (id, status) => {
    try {
      let sql;
      let params;

      if (status === "verified") {
        // IMPORTANT: Set paid_at to NOW() so the financial report can see it
        sql =
          "UPDATE payments SET payment_status = ?, paid_at = NOW() WHERE payment_id = ?";
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
