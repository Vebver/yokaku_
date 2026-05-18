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

  //Resets aanad refresh the tables
// models/Maintenance.js
 // Resets and refresh the tables for a new shift
  resetFloorStatus: async () => {
    try {
      // 1. We update 'status' to 'Available'
      // 2. We reset 'available_seats' to match the 'capacity' of the table
      const [result] = await db.execute("UPDATE tables SET status = 'Available', available_seats = capacity");
      
      // 3. Return the number of tables that were reset
      return result.affectedRows; 
    } catch (error) {
      console.error("Database Error:", error);
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