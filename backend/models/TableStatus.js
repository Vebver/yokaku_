const db = require("../config/db");

const TableStatus = {
  // 1. GET FLOOR PLAN (Table Cards)
  getTableStatus: async () => {
    const query = `
      SELECT 
          t.table_id, 
          t.table_number, 
          t.capacity, 
          
          /* Get current occupant details */
          IFNULL(ANY_VALUE(rt.status), 'available') AS bridge_status,    
          ANY_VALUE(r.first_name) AS first_name,
          ANY_VALUE(r.last_name) AS last_name,
          ANY_VALUE(r.reservation_time) AS reservation_time,
          ANY_VALUE(r.end_time) AS end_time,
          ANY_VALUE(r.reservation_id) AS reservation_id,

          /* QUEUE COUNT: How many bookings total for this table today */
          (SELECT COUNT(*) 
           FROM reservation_tables rt2 
           JOIN reservations r2 ON rt2.reservation_id = r2.reservation_id
           WHERE rt2.table_id = t.table_id 
           AND r2.reservation_date = CURDATE()
           AND r2.status IN ('Confirmed', 'Seated', 'confirmed', 'seated')
          ) AS queue_count,

          /* NEXT RESERVATION: The time of the next guest scheduled for this table */
          (SELECT MIN(r3.reservation_time) 
           FROM reservation_tables rt3
           JOIN reservations r3 ON rt3.reservation_id = r3.reservation_id
           WHERE rt3.table_id = t.table_id
           AND r3.reservation_date = CURDATE()
           AND r3.status = 'Confirmed'
           AND r3.reservation_time > IFNULL(ANY_VALUE(r.reservation_time), '00:00:00')
          ) AS next_reservation_time

      FROM tables t
      LEFT JOIN reservation_tables rt ON t.table_id = rt.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
      LEFT JOIN reservations r ON rt.reservation_id = r.reservation_id
      GROUP BY t.table_id
      /* Order by table number numerically (T1, T2, T10) */
      ORDER BY CAST(REGEXP_REPLACE(t.table_number, '[^0-9]', '') AS UNSIGNED) ASC;
    `;
    
    const [rows] = await db.query(query);
    return rows;
  },

  // 2. GET TIMELINE (Top Bar)
  // Fixed: Removed (req, res) because this is a Model, not a Controller
  getTodaySchedule: async () => {
    const query = `
      SELECT 
        r.reservation_id,
        r.first_name, 
        r.last_name, 
        r.reservation_time, 
        /* Show all table numbers linked to this reservation */
        GROUP_CONCAT(t.table_number SEPARATOR ', ') as table_names
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      JOIN tables t ON rt.table_id = t.table_id
      WHERE r.reservation_date = CURDATE() 
      /* FIX: Include Seated so the bar doesn't disappear when they arrive */
      AND r.status IN ('Confirmed', 'Seated')
      GROUP BY r.reservation_id
      ORDER BY r.reservation_time ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  // 3. CREATE WALK-IN
  createWalkIn: async (tableId, customerName) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const resId = `WALK-${Date.now()}`;
      
      // Store walk-in reservation_time in UTC to eliminate timezone drift.
      // UI should convert to the desired timezone.
      const resQuery = `
        INSERT INTO reservations (reservation_id, first_name, status, reservation_date, reservation_time)
        VALUES (
          ?, ?, 'Seated',
          DATE(UTC_TIMESTAMP()),
          TIME(UTC_TIMESTAMP())
        )
      `;




      await conn.execute(resQuery, [resId, customerName]);


      const bridgeQuery = `
        INSERT INTO reservation_tables (reservation_id, table_id, customer_name, status, check_in_time)
        VALUES (?, ?, ?, 'seated', NOW())
      `;
      await conn.execute(bridgeQuery, [resId, tableId, customerName]);

      await conn.execute(
        "UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?",
        [tableId],
      );

      await conn.commit();
      return { reservation_id: resId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
 // 4. CHECKOUT (Updated to automatically clear active kiosk flag)
  checkoutTable: async (tableId) => {
    try {
      const [rows] = await db.query(
        `SELECT reservation_id FROM reservation_tables 
         WHERE table_id = ? AND LOWER(status) IN ('seated', 'confirmed') 
         LIMIT 1`,
        [tableId]
      );

      if (rows.length > 0 && rows[0].reservation_id) {
        const resId = rows[0].reservation_id;

        // UPDATED: Reset is_kiosk_active to 0 when table is checked out
        await db.query(
          "UPDATE reservations SET status = 'Completed', is_kiosk_active = 0 WHERE reservation_id = ?",
          [resId]
        );

        await db.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ?",
          [resId]
        );
      } else {
        await db.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE table_id = ? AND status = 'seated'",
          [tableId]
        );
      }

      await db.query(
        "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id = ?",
        [tableId]
      );

      return { success: true };
    } catch (err) {
      throw err;
    }
  },

  // 5. CREATE NEW TABLE
  createNewTable: async (tableNumber, capacity) => {
    try {
      const query = `
        INSERT INTO tables (table_number, capacity, available_seats, status)
        VALUES (?, ?, ?, 'available')
      `;
      const [result] = await db.execute(query, [tableNumber, capacity, capacity]);
      return { table_id: result.insertId, table_number: tableNumber, capacity, status: 'available' };
    } catch (err) {
      throw err;
    }
  },

  // 6. DELETE TABLE
  deleteTable: async (tableId) => {
    try {
      const query = `DELETE FROM tables WHERE table_id = ?`;
      await db.execute(query, [tableId]);
      return { success: true, message: "Table deleted successfully" };
    } catch (err) {
      throw err;
    }
  },
};

module.exports = TableStatus;