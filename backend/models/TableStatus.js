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
            (SELECT LOWER(rt.status) FROM reservation_tables rt
             JOIN reservations r ON r.reservation_id = rt.reservation_id
             WHERE rt.table_id = t.table_id
             AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                         (r.reservation_type = 'event') ASC,
                         rt.check_in_time DESC,
                         r.reservation_date ASC, r.reservation_time ASC
                   LIMIT 1),
            LOWER(t.status),
            'available'
          ) AS bridge_status,    

          /* Get the name and reservation ID of the current occupant */
          (SELECT r.first_name FROM reservations r 
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id 
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS first_name,

          (SELECT r.reservation_id FROM reservations r
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS reservation_id,

            (SELECT DATE_FORMAT(r.reservation_date, '%Y-%m-%d') FROM reservations r
             JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
             WHERE rt.table_id = t.table_id
             AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS reservation_date,

          /* Reservation-related metadata for the current occupant (event timer + kiosk stop) */
          (SELECT r.reservation_type FROM reservations r
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS reservation_type,

          (SELECT r.is_kiosk_active FROM reservations r
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS is_kiosk_active,

          (SELECT TIME_FORMAT(r.end_time, '%H:%i:%s') FROM reservations r
           JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
           WHERE rt.table_id = t.table_id
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (r.reservation_type = 'event') ASC,
                      rt.check_in_time DESC,
                      r.reservation_date ASC, r.reservation_time ASC LIMIT 1) AS end_time,

          (SELECT TIME_FORMAT(rt.check_in_time, '%H:%i:%s') FROM reservation_tables rt
           WHERE rt.table_id = t.table_id
           AND rt.status IN ('confirmed', 'seated', 'Confirmed', 'Seated')
             ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                      (SELECT r.reservation_type = 'event' FROM reservations r
                       WHERE r.reservation_id = rt.reservation_id) ASC,
                      rt.check_in_time DESC LIMIT 1) AS check_in_time

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
        `SELECT rt.reservation_id
         FROM reservation_tables rt
         JOIN reservations r ON r.reservation_id = rt.reservation_id
         WHERE rt.table_id = ? AND LOWER(rt.status) IN ('seated', 'confirmed')
         ORDER BY FIELD(LOWER(rt.status), 'seated', 'confirmed'),
                  (r.reservation_type = 'event') ASC,
                  rt.check_in_time DESC
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

  // Active sessions eligible for the kiosk: walk-ins, reservations, and events.
  listKioskCandidates: async () => {
    try {
      const [rows] = await db.execute(
        `SELECT r.reservation_id,
                r.first_name,
                r.last_name,
                COALESCE(NULLIF(r.reservation_type, ''), 'per_table') AS reservation_type,
                r.status,
                r.is_kiosk_active,
                GROUP_CONCAT(t.table_number ORDER BY t.table_number SEPARATOR ', ') AS table_names
         FROM reservations r
         LEFT JOIN reservation_tables rt ON TRIM(r.reservation_id) = TRIM(rt.reservation_id)
         LEFT JOIN tables t ON t.table_id = rt.table_id
         WHERE LOWER(r.status) IN ('seated', 'confirmed', 'pending')
         GROUP BY r.reservation_id, r.first_name, r.last_name,
                  r.reservation_type, r.status, r.is_kiosk_active
         ORDER BY r.is_kiosk_active DESC,
                  (LOWER(COALESCE(r.reservation_type, 'per_table')) = 'event') DESC,
                  r.reservation_time DESC
         LIMIT 50`,
      );

      return rows.map((r) => ({
        ...r,
        is_walkin: String(r.reservation_id || "").toUpperCase().startsWith("WALK-"),
        is_event: String(r.reservation_type || "").toLowerCase() === "event",
      }));
    } catch (err) {
      throw err;
    }
  },

  // 5. CREATE NEW TABLE
  createNewTable: async (tableNumber, capacity) => {
    try {
      const normalizedTableNumber = String(tableNumber || "").trim();
      if (!normalizedTableNumber) {
        throw Object.assign(new Error("Table number is required."), { statusCode: 400 });
      }

      const parsedCapacity = Number(capacity);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 7) {
        throw Object.assign(new Error("Capacity must be between 1 and 7."), { statusCode: 400 });
      }

      const [existingTables] = await db.execute(
        "SELECT table_id FROM tables WHERE LOWER(TRIM(table_number)) = LOWER(?) LIMIT 1",
        [normalizedTableNumber],
      );
      if (existingTables.length > 0) {
        throw Object.assign(new Error("A table with this number already exists."), { statusCode: 409 });
      }

      const query = `
        INSERT INTO tables (table_number, capacity, available_seats, status)
        VALUES (?, ?, ?, 'available')
      `;
      const [result] = await db.execute(query, [
        normalizedTableNumber,
        parsedCapacity,
        parsedCapacity,
      ]);
      return {
        table_id: result.insertId,
        table_number: normalizedTableNumber,
        capacity: parsedCapacity,
        status: "available",
      };
    } catch (err) {
      throw err;
    }
  },

  // Set a table's status directly (manual override from the Table Status page)
  setManualStatus: async (tableId, status) => {
    const normalizedStatus = String(status || "").toLowerCase();
    if (!["available", "occupied"].includes(normalizedStatus)) {
      throw new Error("Table status must be available or occupied.");
    }

    // Freeing a table that still has a live reservation would leave the
    // guest seated with no table, so block it and point to the checkout flow.
    if (normalizedStatus === "available") {
      const [seated] = await db.execute(
        `SELECT rt.reservation_id
         FROM reservation_tables rt
         WHERE rt.table_id = ? AND LOWER(rt.status) IN ('confirmed', 'seated')
         LIMIT 1`,
        [tableId],
      );
      if (seated.length > 0) {
        throw Object.assign(
          new Error(
            "This table still has a guest seated. Check out the table or stop the kiosk session before marking it vacant.",
          ),
          { statusCode: 409 },
        );
      }
    }

    const [result] = await db.execute(
      `UPDATE tables
       SET status = ?, available_seats = CASE WHEN ? = 'occupied' THEN 0 ELSE capacity END
       WHERE table_id = ?`,
      [normalizedStatus, normalizedStatus, tableId],
    );

    return { affectedRows: result.affectedRows, status: normalizedStatus };
  },

  // 7. DELETE TABLE
  deleteTable: async (tableId) => {
    try {
      const [activeReservations] = await db.execute(
        `SELECT reservation_id FROM reservation_tables
         WHERE table_id = ? AND LOWER(status) IN ('confirmed', 'seated')
         LIMIT 1`,
        [tableId],
      );
      if (activeReservations.length > 0) {
        throw Object.assign(new Error("Cannot delete a table assigned to an active reservation or event."), { statusCode: 409 });
      }

      const query = `DELETE FROM tables WHERE table_id = ?`;
      const [result] = await db.execute(query, [tableId]);
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (err) {
      throw err;
    }
  },
};

module.exports = TableStatus;
