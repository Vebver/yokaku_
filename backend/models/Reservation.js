const db = require('../config/db');

const Reservation = {
  // 1. GET ALL: "Composes" the address and the list of linked tables
  getAll: async () => {
    const sql = `
      SELECT 
        r.*, 
        p.payment_status,
        CONCAT(b.brgy_name, ', ', m.muni_name) AS full_address,
        GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
      LEFT JOIN municipalities m ON b.muni_code = m.muni_code
      LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      LEFT JOIN tables t ON rt.table_id = t.table_id
      GROUP BY r.reservation_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. FIND BY ID: Gets full composite details for one specific booking
 findById: async (id) => {
    const sql = `
      SELECT 
        r.*,
        CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address,
        GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables
      FROM reservations r
      LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
      LEFT JOIN municipalities m ON b.muni_code = m.muni_code
      LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      LEFT JOIN tables t ON rt.table_id = t.table_id
      WHERE r.reservation_id = ?
      GROUP BY r.reservation_id
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows[0]; // Returns undefined if not found, which triggers the 404 in controller
  },
  
  // 3. CREATE: The "Composite" logic — Saves to 'reservations' AND 'reservation_tables'
  create: async (reservationData) => {
    const { 
      userId, firstName, lastName, email, phone, date, time, 
      guests, packageName, brgyCode, tableIds // tableIds should be an array (e.g., [1, 2])
    } = reservationData;

    // Use a connection from the pool to ensure both inserts happen together (Transaction)
    const conn = await db.getConnection();
    
    try {
      await conn.beginTransaction();

      // Step A: Insert the core reservation info (includes the composite address link)
      const resQuery = `
        INSERT INTO reservations 
        (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name, brgy_code) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [resResult] = await conn.execute(resQuery, [
        userId, firstName, lastName, email, phone, date, time, guests, packageName, brgyCode
      ]);

      const newReservationId = resResult.insertId;

      // Step B: Link the Tables in the Composite Junction Table
      if (tableIds && tableIds.length > 0) {
        const tableLinkQuery = `INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)`;
        
        // Loop through all selected/linked tables from the React floor plan
        for (const tId of tableIds) {
          const numericTableId = parseInt(String(tId).replace('T', '')); // Convert "T1" to 1, etc.
          await conn.execute(tableLinkQuery, [newReservationId, numericTableId]);
        }
      }

      await conn.commit();
      return { id: newReservationId, ...reservationData };
    } catch (err) {
      await conn.rollback(); // If any part fails, nothing is saved
      throw err;
    } finally {
      conn.release(); // Always release the connection back to the pool
    }
  },

  updateStatus: async (id, status) => {
    const query = 'UPDATE reservations SET status = ? WHERE reservation_id = ?';
    await db.execute(query, [status, id]);
  },

  delete: async (id) => {
    // If your DB has "ON DELETE CASCADE" on the foreign keys, 
    // deleting from 'reservations' will automatically clean up 'reservation_tables'
    const query = 'DELETE FROM reservations WHERE reservation_id = ?';
    await db.execute(query, [id]);
  }
};

module.exports = Reservation;