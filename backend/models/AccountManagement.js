const db = require('../config/db');

const AccountManagement = {
    getAll: async () => {
        const sql = `
        SELECT user_id, first_name, last_name, email, role
        FROM users
        ORDER BY user_id
      `;
        const [rows] = await db.execute(sql);
        return rows;
    },
    updateUserRole: async (user_id, role) => {
        const sql = `
        UPDATE users
        SET role = ?
        WHERE user_id = ?
        `;
        const [result] = await db.execute(sql, [role, user_id]);
        return result;
    }
}

module.exports = AccountManagement;