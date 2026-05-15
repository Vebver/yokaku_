const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const Maintenance = {
  // 1. Archive Logic: Removing records that are already finished
  archiveOldRecords: async () => {
    // Instead of just 'Seated', we target records that are truly "Done" 
    // so the manager's active list stays clean.
    const sql = `
      DELETE FROM reservations 
      WHERE (status = 'Completed' OR status = 'Rejected' OR status = 'Done' OR status = 'Cancelled') 
      AND created_at < NOW() - INTERVAL 1 MONTH
    `;
    const [result] = await db.execute(sql);
    return result.affectedRows;
  },

  // 2. Storage Optimization: Deleting physical files
  optimizeStorage: async () => {
    const sql = `
      SELECT receipt_path FROM reservations 
      WHERE (status = 'Completed' OR status = 'Rejected' OR status = 'Done')
      AND created_at < NOW() - INTERVAL 3 MONTH
      AND receipt_path IS NOT NULL
    `;
    const [rows] = await db.execute(sql);
    
    let deletedCount = 0;
    rows.forEach(row => {
      const filePath = path.join(__dirname, '../uploads/', row.receipt_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); 
        deletedCount++;
      }
    });

    await db.execute(`
      UPDATE reservations SET receipt_path = NULL 
      WHERE (status = 'Completed' OR status = 'Rejected' OR status = 'Done')
      AND created_at < NOW() - INTERVAL 3 MONTH
    `);

    return deletedCount;
  },

  // 3. Data Export: Get all records for CSV
  getExportData: async () => {
    const [rows] = await db.execute("SELECT * FROM reservations ORDER BY created_at DESC");
    return rows;
  }
};
 
module.exports = Maintenance;