const db = require("../config/db");

const TableStatus = {
  getTableStatus: async () => {
    const query = `
      SELECT 
          t.table_id, 
          t.table_number, 
          t.capacity, 
          
          /* PRIORITIZE 'seated' status for the color */
          COALESCE(
            (SELECT status FROM reservation_tables 
             WHERE table_id = t.table_id 
             AND status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(status), 'seated', 'confirmed') 
             LIMIT 1),
            'available'
          ) AS bridge_status,    

          /* Get the name and reservation ID of the current occupant */
          (SELECT r.first_name FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS first_name,

          (SELECT r.reservation_id FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS reservation_id,

          /* Reservation-related metadata for the current occupant (event timer + kiosk stop) */
          (SELECT r.reservation_type FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS reservation_type,

          (SELECT r.is_kiosk_active FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS is_kiosk_active,

          (SELECT TIME_FORMAT(r.end_time, '%H:%i:%s') FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS end_time,

          (SELECT TIME_FORMAT(rt.check_in_time, '%H:%i:%s') FROM reservation_tables rt
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
           ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed') LIMIT 1) AS check_in_time

      FROM tables t
      GROUP BY t.table_id
      ORDER BY CAST(REGEXP_REPLACE(t.table_number, '[^0-9]', '') AS UNSIGNED) ASC;
    `;
    const [rows] = await db.query(query);
    return rows;
  },
getTodaySchedule: async () => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      timeZone: "Asia/Manila"
    });

    const conn = await db.getConnection();
    try {
      // SAFEGUARD: Automatically complete any active reservations whose session times have already passed
      await conn.execute(
        `
        UPDATE reservations r 
        LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        SET r.status = 'Completed', rt.status = 'completed'
        WHERE (r.reservation_date < ?) OR (r.reservation_date = ? AND r.end_time < ?)
        AND r.status IN ('Seated', 'Confirmed', 'Pending')
        `,
        [today, today, nowTime]
      );

const query = `
        SELECT 
          r.reservation_id,
          r.first_name, 
          r.last_name, 
          TIME_FORMAT(r.reservation_time, '%h:%i %p') as formatted_time,
          r.reservation_time, 
          r.reservation_type,
          r.status, 
          GROUP_CONCAT(t.table_number SEPARATOR ', ') as table_names
        FROM reservations r
        LEFT JOIN reservation_tables rt ON TRIM(r.reservation_id) = TRIM(rt.reservation_id)
        LEFT JOIN tables t ON rt.table_id = t.table_id
        WHERE (
          /* Reservations scheduled for today */
          DATE(r.reservation_date) = DATE(?) AND LOWER(r.status) = 'seated'
          OR
          /* ACTIVE KIOSK reservations even if their reserve date is far away */
          r.is_kiosk_active = 1 AND LOWER(r.status) IN ('seated', 'confirmed')
        )
        GROUP BY 
          r.reservation_id, 
          r.first_name, 
          r.last_name, 
          r.reservation_time, 
          r.reservation_type,
          r.status
        ORDER BY r.reservation_time ASC
      `;
      const [rows] = await conn.query(query, [today]);
      return rows;
    } catch (err) {
      console.error("Error fetching and self-healing timeline:", err);
      throw err;
    } finally {
      conn.release();
    }
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
        [tableId],
      );

      if (rows.length > 0 && rows[0].reservation_id) {
        const resId = rows[0].reservation_id;

        // Reset is_kiosk_active to 0 and set reservation to Completed
        await db.query(
          "UPDATE reservations SET status = 'Completed', is_kiosk_active = 0 WHERE reservation_id = ?",
          [resId],
        );

        await db.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ?",
          [resId],
        );
      } else {
        // Fallback safeguard to clear the table bridge mapping status regardless
        await db.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE table_id = ? AND LOWER(status) IN ('seated', 'confirmed')",
          [tableId],
        );
      }

      // Always reset physical table state to available
      await db.query(
        "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id = ?",
        [tableId],
      );

return { success: true };
    } catch (err) {
      throw err;
    }
  },

  // 4.5 STOP KIOSK (Clears the active kiosk flag for a single reservation)
  stopKiosk: async (reservationId) => {
    try {
      const [result] = await db.query(
        "UPDATE reservations SET is_kiosk_active = 0 WHERE reservation_id = ? AND is_kiosk_active = 1",
        [reservationId],
      );
      return { success: true, affected: result.affectedRows, reservationId };
    } catch (err) {
      throw err;
    }
  },

  // 5. CREATE NEW TABLE
  createNewTable: async (tableNumber, capacity) => {
    try {
      const parsedCapacity = Number(capacity);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 7) {
        throw new Error("Capacity must be between 1 and 7.");
      }

      const query = `
        INSERT INTO tables (table_number, capacity, available_seats, status)
        VALUES (?, ?, ?, 'available')
      `;
      const [result] = await db.execute(query, [
        tableNumber,
        parsedCapacity,
        parsedCapacity,
      ]);
      return {
        table_id: result.insertId,
        table_number: tableNumber,
        capacity: parsedCapacity,
        status: "available",
      };
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
