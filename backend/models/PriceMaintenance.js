
// const db = require('../config/db');

// const PriceMaintenance = {
//   getSettings: async () => {
//     const [rows] = await db.execute("SELECT * FROM price_maintenance WHERE id = 1");
//     return rows[0];
//   },

//   updateSettings: async (data) => {
//     const { is_peak_enabled, peak_increase_percent, peak_start_time, peak_end_time } = data;
    
//     // FORCE CONVERSION: true -> 1, false -> 0
//     const status = is_peak_enabled === true || is_peak_enabled == 1 ? 1 : 0;
    
//     const sql = `
//       UPDATE price_maintenance 
//       SET is_peak_enabled = ?, 
//           peak_increase_percent = ?, 
//           peak_start_time = ?, 
//           peak_end_time = ? 
//       WHERE id = 1`;
      
//     const [result] = await db.execute(sql, [
//       status, 
//       peak_increase_percent, 
//       peak_start_time, 
//       peak_end_time
//     ]);
//     return result;
//   }
// };

// module.exports = PriceMaintenance;