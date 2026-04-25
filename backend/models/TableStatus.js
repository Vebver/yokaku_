const db = require("../config/db");

const TableStatus = {
  getTableStatus: async () => {
    try {
      const query = `
                SELECT 
                    t.table_id, 
                    t.table_number, 
                    t.capacity, 
                    t.status AS table_condition, -- This is the 'status' from your tables table
                    r.reservation_id, 
                    r.customer_name, 
                    r.check_in_time, 
                    r.status AS reservation_status -- This is the 'status' from reservation_table
                FROM tables t
                LEFT JOIN reservation_tables r 
                    ON t.table_id = r.table_id 
                    AND r.status = 'seated'
                ORDER BY CAST(t.table_number AS UNSIGNED) ASC;
            `;
      const [rows] = await db.query(query);
      return rows;
    } catch (err) {
      console.error("SQL Error:", err);
      throw err;
    }
  }, // Corrected comma/brace here

  // POST/CREATE a new walk-in session
  createWalkIn: async (tableId, customerName) => {
    try {
      const query = `
                INSERT INTO reservation_tables (table_id, customer_name, status, check_in_time, reservation_date)
                VALUES (?, ?, 'seated', NOW(), CURDATE())
            `;
      const [result] = await db.query(query, [tableId, customerName]);

      // Update table status to occupied
      const updateTableQuery = `UPDATE tables SET status = 'occupied' WHERE table_id = ?`;
      await db.query(updateTableQuery, [tableId]);

      return result;
    } catch (err) {
      throw err;
    }
  },

  // Optional: Add a checkout function to clear the table
  checkoutTable: async (tableId) => {
    try {
      // Clear the reservation_tables entry for this table
      const query = `
                UPDATE reservation_tables 
                SET status = 'completed' 
                WHERE table_id = ? AND status = 'seated'
            `;
      await db.query(query, [tableId]);

      // Reset table status to available
      const updateTableQuery = `UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id = ?`;
      await db.query(updateTableQuery, [tableId]);

      return { success: true };
    } catch (err) {
      throw err;
    }
  },

  // Update table status based on reservation status
  updateTableStatusByReservation: async (reservationId, status) => {
    try {
      let tableStatus = "available";
      if (status === "Seated") {
        tableStatus = "occupied";
      } else if (status === "Confirmed" || status === "Pending") {
        tableStatus = "reserved";
      }

      // Get reservation details including number of guests and tables
      const resQuery = `
                SELECT r.num_guests, GROUP_CONCAT(rt.table_id) as table_ids, t.capacity
                FROM reservations r
                JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
                LEFT JOIN tables t ON rt.table_id = t.table_id
                WHERE r.reservation_id = ?
                GROUP BY r.reservation_id
            `;
      const [resData] = await db.query(resQuery, [reservationId]);

      if (resData && resData.length > 0) {
        const { num_guests, table_ids } = resData[0];
        const tableIdArray = table_ids
          ? table_ids.split(",").map((id) => parseInt(id))
          : [];

        // Update each table's status and available seats
        for (const tableId of tableIdArray) {
          let availableSeats = null;

          if (status === "Seated" && num_guests) {
            // Get table capacity and reduce by guests
            const tableQuery = `SELECT capacity FROM tables WHERE table_id = ?`;
            const [tableData] = await db.query(tableQuery, [tableId]);
            if (tableData && tableData.length > 0) {
              availableSeats = tableData[0].capacity - num_guests;
            }
          }

          // Update table status and available seats
          let updateQuery = `UPDATE tables SET status = ?`;
          const params = [tableStatus];

          if (availableSeats !== null) {
            updateQuery += `, available_seats = ?`;
            params.push(availableSeats);
          }

          updateQuery += ` WHERE table_id = ?`;
          params.push(tableId);

          await db.query(updateQuery, params);
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Error updating table status:", err);
      throw err;
    }
  },
};

module.exports = TableStatus;
