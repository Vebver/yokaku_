const db = require("../config/db");

const AuditLog = {
  getAll: async () => {
    try {
      // Primary attempt: Queries the audit_logs table, joins actor on u.user_id, and joins target on target_u.user_id
      const sql = `
        SELECT 
          al.log_id,
          al.user_id,
          u.first_name,
          al.action,
          al.target_id,
          target_u.first_name AS target_name,
          al.details,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        LEFT JOIN users target_u ON al.target_id = target_u.user_id
        ORDER BY al.created_at DESC
      `;
      const [rows] = await db.execute(sql);
      return rows;
    } catch (err) {
      // Fallback: Joins on 'id' if the users table primary key is named 'id'
      try {
        const sql = `
          SELECT 
            al.log_id,
            al.user_id,
            u.first_name,
            al.action,
            al.target_id,
            target_u.first_name AS target_name,
            al.details,
            al.created_at
          FROM audit_logs al
          LEFT JOIN users u ON al.user_id = u.id
          LEFT JOIN users target_u ON al.target_id = target_u.id
          ORDER BY al.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
      } catch (err2) {
        console.error("Audit log retrieval query failed:", err2.message);
        return [];
      }
    }
  }
};

module.exports = AuditLog;