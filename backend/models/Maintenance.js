const db = require("../config/db")

const Maintenance = {
  setKioskReservation: async (reservationId) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Reset any previous active kiosk reservations
      await conn.execute(
        "UPDATE reservations SET is_kiosk_active = 0 WHERE is_kiosk_active = 1",
      );

      // 2. Set the newly selected reservation as active for the kiosk
      const sql = "UPDATE reservations SET is_kiosk_active = 1 WHERE reservation_id = ?";
      const [result] = await conn.execute(sql, [reservationId]);

      // 3. AUTO-SEAT: Automatically transition this reservation's status to 'Seated'
      if (result.affectedRows > 0) {
        // Update reservations status to Seated
        await conn.execute(
          "UPDATE reservations SET status = 'Seated' WHERE reservation_id = ?",
          [reservationId]
        );

        // Update reservation tables binding to seated
        await conn.execute(
          "UPDATE reservation_tables SET status = 'seated' WHERE reservation_id = ?",
          [reservationId]
        );

        // Update physical tables status to occupied (turning them red on the dashboard)
        await conn.execute(
          `UPDATE tables t 
           JOIN reservation_tables rt ON t.table_id = rt.table_id 
           SET t.status = 'occupied' WHERE rt.reservation_id = ?`,
          [reservationId]
        );
      }

      await conn.commit();
      return result.affectedRows;
    } catch (error) {
      await conn.rollback();
      console.error("Set Kiosk Reservation Transaction Error:", error);
      throw error;
    } finally {
      conn.release();
    }
  },

  // Resets and refresh the tables for a new shift
 // Inside models/Maintenance.js (under resetFloorStatus):

  resetFloorStatus: async () => {
    try {
      // 1. Reset the physical table status (Turns the card Green on admin panel)
      const resetTablesSql = `
        UPDATE tables 
        SET status = 'Available', 
            available_seats = capacity
      `;
      await db.execute(resetTablesSql);

      // 2. Clear the active guests
      const clearReservationsSql = `
        UPDATE reservation_tables 
        SET status = 'completed' 
        WHERE status = 'seated' OR status = 'confirmed'
      `;
      const [result] = await db.execute(clearReservationsSql);

      // 3. ADDED: Clear all active kiosk pushed configurations (Exits the kiosk back to selection screen)
      const clearKiosksSql = `
        UPDATE reservations 
        SET is_kiosk_active = 0 
        WHERE is_kiosk_active = 1
      `;
      await db.execute(clearKiosksSql);

      // Return how many guests were cleared
      return result.affectedRows;
    } catch (error) {
      console.error("Shift Reset Error:", error);
      throw error;
    }
  },

  // 3. Data Export: Get all records for CSV
  getExportData: async () => {
    const sql = `
      SELECT 
        reservation_id, 
        user_id, 
        first_name, 
        last_name, 
        email, 
        phone, 
        reservation_date, 
        reservation_time, 
        end_time, 
        num_guests, 
        package_name, 
        status, 
        brgy_code, 
        allergy, 
        occasion, 
        duration_hours, 
        downpayment_amount, 
        reservation_type, 
        created_at 
      FROM reservations 
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },
};

module.exports = Maintenance;