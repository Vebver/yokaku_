const db = require('../config/db');

const Billing = {
    getAll: async () => {
        const sql = `
      SELECT 
        p.*, 
        r.first_name, 
        r.last_name, 
        r.reservation_date, 
        REPLACE(r.receipt_path, 'uploads/', '') AS receipt_path 
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.reservation_id
      ORDER BY p.paid_at DESC
    `;
        const [rows] = await db.execute(sql);
        return rows;
    },

    updateStatus: async(id , status) => {
        const [result] = await db.execute(
            'UPDATE payments SET payment_status = ? WHERE payment_id = ?',
            [status, id]
        );
        return result;
    }
};
module.exports = Billing;