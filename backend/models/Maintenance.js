const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const Maintenance = {
    cleanReserve: async () => {
    const sql = `
      DELETE FROM reservations 
      WHERE status = 'Seated' 
      AND created_at < NOW() - INTERVAL 2 HOUR
    `;
    const [result] = await db.execute(sql);
    return result.affectedRows;
  },

 // 2. Storage Management: Delete receipt files of Completed/Rejected orders older than 3 months
  cleanOldReceipts: async () => {
    // Get list of file paths from DB for old/finished reservations
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
        fs.unlinkSync(filePath); // Delete file from folder
        deletedCount++;
      }
    });

    // Remove the paths from DB so we don't try to delete them again
    await db.execute(`
      UPDATE reservations SET receipt_path = NULL 
      WHERE (status = 'Completed' OR status = 'Rejected' OR status = 'Done')
      AND created_at < NOW() - INTERVAL 3 MONTH
    `);

    return deletedCount;
  }
};

module.exports = Maintenance;