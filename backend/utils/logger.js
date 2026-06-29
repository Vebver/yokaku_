const db = require("../config/db");

const logActivity = async (userId, action, targetId, details, req = null) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const sql = `
      INSERT INTO audit_logs (user_id, action, target_id, details) 
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [
      userId || null, 
      action, 
      targetId || null, 
      details ? JSON.stringify(details) : null, 
    ]);
  } catch (err) {
    console.error("Audit log failed to write:", err.message);
  }
};

module.exports = { logActivity };