const db = require('../config/db');

const BlockedDate = {
  add: async (date, reason) => {
    return await db.execute("INSERT INTO blocked_dates (block_date, reason) VALUES (?, ?)", [date, reason]);
  },
  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM blocked_dates ORDER BY block_date ASC");
    return rows;
  },
  delete: async (id) => {
    return await db.execute("DELETE FROM blocked_dates WHERE id = ?", [id]);
  }
};

module.exports = BlockedDate;const db = require('../config/db');

const BlockedDate = {
  add: async (date, reason) => {
    return await db.execute("INSERT INTO blocked_dates (block_date, reason) VALUES (?, ?)", [date, reason]);
  },
  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM blocked_dates ORDER BY block_date ASC");
    return rows;
  },
  delete: async (id) => {
    return await db.execute("DELETE FROM blocked_dates WHERE id = ?", [id]);
  }
};

module.exports = BlockedDate;const db = require('../config/db');

const BlockedDate = {
  add: async (date, reason) => {
    return await db.execute("INSERT INTO blocked_dates (block_date, reason) VALUES (?, ?)", [date, reason]);
  },
  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM blocked_dates ORDER BY block_date ASC");
    return rows;
  },
  delete: async (id) => {
    return await db.execute("DELETE FROM blocked_dates WHERE id = ?", [id]);
  }
};

module.exports = BlockedDate;