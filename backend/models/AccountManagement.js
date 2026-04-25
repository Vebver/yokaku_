const db = require('../config/db');

const AccountManagement = {
    getAll: async () => {
        const sql = `
        SELECT user_id, first_name, last_name, email, is_admin
        FROM users
        ORDER BY user_id
      `;
        const [rows] = await db.execute(sql);
        return rows;
    },
    updateUserRole: async (userId, isAdmin) => {
        const sql = `
        UPDATE users
        SET is_admin = ?
        WHERE user_id = ?
        `;
        const [result] = await db.execute(sql, [isAdmin, userId]);
        return result;
    }
}

module.exports = AccountManagement;