const db = require('../config/db');

const BlockedDate = {
  getAll: async () => {
    const sql = `
      SELECT 
        id,
        block_date, 
        reason 
      FROM blocked_dates 
      ORDER BY block_date ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },
  add: async (date, reason) => {
    return await db.execute("INSERT INTO blocked_dates (block_date, reason) VALUES (?, ?)", [date, reason]);
  },
  delete: async (id) => {
    return await db.execute("DELETE FROM blocked_dates WHERE id = ?", [id]);
  }
};

module.exports = BlockedDate;