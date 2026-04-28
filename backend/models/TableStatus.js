const db = require("../config/db");

const TableStatus = {
  getTableStatus: async () => {
    const query = `
    SELECT 
        t.table_id, 
        t.table_number, 
        t.capacity, 
        rt.status AS bridge_status,    
        rt.customer_name, 
        rt.reservation_id,  -- <--- MAKE SURE THIS IS HERE
        r.status AS main_status
    FROM tables t
    LEFT JOIN reservation_tables rt ON t.table_id = rt.table_id 
         AND rt.status IN ('confirmed', 'seated') 
    LEFT JOIN reservations r ON rt.reservation_id = r.reservation_id 
         AND DATE(r.reservation_date) = CURDATE()
    ORDER BY CAST(t.table_number AS UNSIGNED) ASC;
  `;
    const [rows] = await db.query(query);
    return rows;
  },
  createWalkIn: async (tableId, customerName) => {
    try {
      // 1. Create a "Seated" entry in the bridge table for today
      const query = `
        INSERT INTO reservation_tables (table_id, customer_name, status, check_in_time)
        VALUES (?, ?, 'seated', NOW())
      `;
      const [result] = await db.query(query, [tableId, customerName]);

      // 2. Update the master table status
      await db.query(
        `UPDATE tables SET status = 'occupied' WHERE table_id = ?`,
        [tableId],
      );

      return result;
    } catch (err) {
      throw err;
    }
  },

  checkoutTable: async (tableId) => {
    try {
      // 1. Mark the bridge entry as completed
      await db.query(
        `
        UPDATE reservation_tables 
        SET status = 'completed' 
        WHERE table_id = ? AND status IN ('seated', 'confirmed')
      `,
        [tableId],
      );

      // 2. Reset the table to available
      await db.query(
        `UPDATE tables SET status = 'available' WHERE table_id = ?`,
        [tableId],
      );

      return { success: true };
    } catch (err) {
      throw err;
    }
  },

  createNewTable: async (number, capacity) => {
    const sql =
      "INSERT INTO tables (table_number, capacity, status) VALUES (?, ?, 'available')";
    return await db.execute(sql, [number, capacity]);
  },
   updateTableStatusByReservation: async (reservationId, status) => {
    try {
      const bridgeStatus = status.toLowerCase(); // Converts 'Seated' to 'seated'
      const sql = "UPDATE reservation_tables SET status = ? WHERE reservation_id = ?";
      
      // Use .execute for prepared statements
      const [result] = await db.execute(sql, [bridgeStatus, reservationId]);
      return result;
    } catch (err) {
      console.error("Error updating bridge table status:", err);
      throw err;
    }
  },
};

module.exports = TableStatus;
