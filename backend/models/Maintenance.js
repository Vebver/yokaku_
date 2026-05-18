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

 // Resets and refresh the tables for a new shift
resetFloorStatus: async () => {
    try {
      // 1. Reset the physical table status (Turns the card Green)
      const resetTablesSql = `
        UPDATE tables 
        SET status = 'Available', 
            available_seats = capacity
      `;
      await db.execute(resetTablesSql);

      // 2. Clear the active guests (Removes "Test 1" from the card)
      // We mark them as 'completed' so they no longer show up as active seated guests
      const clearReservationsSql = `
        UPDATE reservation_tables 
        SET status = 'completed' 
        WHERE status = 'seated' OR status = 'confirmed'
      `;
      const [result] = await db.execute(clearReservationsSql);

      // Return how many guests were cleared
      return result.affectedRows; 
    } catch (error) {
      console.error("Shift Reset Error:", error);
      throw error;
    }
  },
  // 3. Data Export: Get all records for CSV
  getExportData: async () => {
    const [rows] = await db.execute("SELECT * FROM reservations ORDER BY created_at DESC");
    return rows;
  }
};
 
module.exports = Maintenance;