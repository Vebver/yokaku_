const cron = require("node-cron");
const db = require("./config/db");
const Notification = require("./models/Notification");

const startCronJobs = () => {
  console.log("Starting synchronized reservation cron job...");

  cron.schedule("* * * * *", async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      const currentDate = now.toISOString().split("T")[0];

      console.log(`⏰ Cron running at ${currentDate} ${currentTime}`);

      // --- 1. SEATED SYNC (Ongoing reservations) ---
      const [seatedResult] = await conn.execute(
        `
        UPDATE reservations r
        JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        SET r.status = 'Seated', rt.status = 'seated'
        WHERE r.reservation_date = ? 
        AND r.status = 'Confirmed'
        AND r.reservation_time <= ?
        AND r.end_time >= ?
      `,
        [currentDate, currentTime, currentTime],
      );

      if (seatedResult.affectedRows > 0) {
        console.log(`✅ Updated ${seatedResult.affectedRows} to Seated`);
      }

      // --- 2. COMPLETED - DIRECTLY FROM CONFIRMED (EXPIRED) ---
      // This handles confirmed reservations that never became Seated
      const [expiredConfirmedResult] = await conn.execute(
        `
        UPDATE reservations r
        JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        SET r.status = 'Completed', rt.status = 'completed'
        WHERE r.reservation_date = ? 
        AND r.status = 'Confirmed'
        AND r.end_time < ?
      `,
        [currentDate, currentTime],
      );

      if (expiredConfirmedResult.affectedRows > 0) {
        console.log(
          `✅ Updated ${expiredConfirmedResult.affectedRows} expired Confirmed to Completed`,
        );

        // Free up the tables
        const [tablesToFree] = await conn.execute(
          `
          SELECT DISTINCT rt.table_id 
          FROM reservations r
          JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
          WHERE r.reservation_date = ? 
          AND r.status = 'Completed'
          AND r.end_time < ?
        `,
          [currentDate, currentTime],
        );

        if (tablesToFree.length > 0) {
          const tableIds = tablesToFree.map((t) => t.table_id);
          await conn.query(
            "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id IN (?)",
            [tableIds],
          );
        }
      }

      // --- 3. COMPLETED FROM SEATED ---
      const [toComplete] = await conn.execute(
        `
        SELECT rt.table_id, r.reservation_id 
        FROM reservations r
        JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        WHERE r.reservation_date = ? AND r.status = 'Seated' AND r.end_time < ?
      `,
        [currentDate, currentTime],
      );

      if (toComplete.length > 0) {
        const resIds = toComplete.map((i) => i.reservation_id);
        const tableIds = toComplete.map((i) => i.table_id);

        await conn.query(
          "UPDATE reservations SET status = 'Completed' WHERE reservation_id IN (?)",
          [resIds],
        );
        await conn.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id IN (?)",
          [resIds],
        );
        await conn.query(
          "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id IN (?)",
          [tableIds],
        );

        console.log(`✅ Completed ${resIds.length} Seated reservations`);
      }

      // --- 4. PAST DATES CLEANUP ---
      const [pastReservations] = await conn.execute(
        `
        SELECT rt.table_id, r.reservation_id 
        FROM reservations r
        JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        WHERE r.reservation_date < ? AND r.status NOT IN ('Completed', 'Rejected', 'Cancelled')
      `,
        [currentDate],
      );

      if (pastReservations.length > 0) {
        const pResIds = pastReservations.map((i) => i.reservation_id);
        const pTableIds = pastReservations.map((i) => i.table_id);

        await conn.query(
          "UPDATE reservations SET status = 'Completed' WHERE reservation_id IN (?)",
          [pResIds],
        );
        await conn.query(
          "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id IN (?)",
          [pResIds],
        );
        await conn.query(
          "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id IN (?)",
          [pTableIds],
        );

        console.log(`✅ Cleaned up ${pResIds.length} past reservations`);
      }

      // 5. Notification Cleanup
      await Notification.permanentlyDeleteExpired();

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      console.error("❌ Cron sync error:", error);
    } finally {
      conn.release();
    }
  });

  console.log("✅ Reservation status cron job started (runs every minute)");
};

module.exports = startCronJobs;
