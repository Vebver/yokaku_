const db = require("../config/db");

const TableStatus = {
  getTableStatus: async () => {
  const query = `
    SELECT 
        t.table_id, 
        t.table_number, 
        t.capacity, 
        /* Use COALESCE to provide a default if no active bridge record is found */
        IFNULL(rt.status, 'available') AS bridge_status,    
        rt.customer_name, 
        rt.reservation_id
    FROM tables t
    /* We only join records that are currently ACTIVE (confirmed or seated) */
    LEFT JOIN reservation_tables rt ON t.table_id = rt.table_id 
         AND rt.status IN ('confirmed', 'seated')
    /* This grouping prevents the "Doubling" issue */
    GROUP BY t.table_id
    ORDER BY CAST(REGEXP_REPLACE(t.table_number, '[^0-9]', '') AS UNSIGNED) ASC;
  `;
  const [rows] = await db.query(query);
  return rows;
},
  // models/TableStatus.js

  createWalkIn: async (tableId, customerName) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Create a "Dummy" Reservation ID for this Walk-in
      // This ensures foreign keys don't break.
      const resId = `WALK-${Date.now()}`;
      const resQuery = `
      INSERT INTO reservations (reservation_id, first_name, status, reservation_date, reservation_time) 
      VALUES (?, ?, 'Seated', CURDATE(), CURTIME())
    `;
      await conn.execute(resQuery, [resId, customerName]);

      // 2. Link the table to this dummy reservation
      const bridgeQuery = `
      INSERT INTO reservation_tables (reservation_id, table_id, customer_name, status, check_in_time)
      VALUES (?, ?, ?, 'seated', NOW())
    `;
      await conn.execute(bridgeQuery, [resId, tableId, customerName]);

      // 3. Update the master table status
      await conn.execute(
        "UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?",
        [tableId],
      );

      await conn.commit();
      return { reservation_id: resId };
    } catch (err) {
      await conn.rollback();
      console.error("WALKIN DB ERROR:", err); // Check your VS Code terminal for this!
      throw err;
    } finally {
      conn.release();
    }
  },

checkoutTable: async (tableId) => {
  try {
    // 1. FIRST: Find the reservation_id currently sitting at this table
    // We use LOWER() to make sure 'Seated' and 'seated' both work
    const [rows] = await db.query(
      `SELECT reservation_id FROM reservation_tables 
       WHERE table_id = ? AND LOWER(status) IN ('seated', 'confirmed') 
       LIMIT 1`,
      [tableId]
    );

    console.log("Checking out Table ID:", tableId);

    if (rows.length > 0 && rows[0].reservation_id) {
      const resId = rows[0].reservation_id;
      console.log("Found Reservation ID to complete:", resId);

      // 2. Update the MAIN reservations table
      // This is what allows the customer to reserve again!
      await db.query(
        "UPDATE reservations SET status = 'Completed' WHERE reservation_id = ?",
        [resId]
      );

      // 3. Mark the BRIDGE table entry as completed
      await db.query(
        "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ?",
        [resId]
      );
    } else {
      // If it was a walk-in without a reservation_id, just clean the table entries
      await db.query(
        "UPDATE reservation_tables SET status = 'completed' WHERE table_id = ? AND status = 'seated'",
        [tableId]
      );
    }

    // 4. CRITICAL: Reset the master table back to 'available'
    await db.query(
      "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id = ?",
      [tableId]
    );

    return { success: true };
  } catch (err) {
    console.error("Checkout Logic Error:", err);
    throw err;
  }
},
};

module.exports = TableStatus;
