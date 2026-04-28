const db = require('../config/db');

const BlockedDate = {
  getAll: async () => {
    // The [rows] syntax is specific to mysql2/promise
    const [rows] = await db.execute("SELECT * FROM blocked_dates ORDER BY block_date ASC");
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