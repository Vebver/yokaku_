const cron = require("node-cron");
const db = require("./config/db");
const Notification = require("./models/Notification");
const { sendReminderEmail } = require("./utils/emailService");
const startCronJobs = () => {
  // This cron job runs every minute to keep statuses in sync
  cron.schedule("* * * * *", async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      const currentDate = now.toISOString().split("T")[0];

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

      // --- 5. 12-HOUR EXPIRED REJECTIONS AUTO-CANCELLATION ---
      // This checks for rejected payments over 12 hours old, cancels the reservation, and frees the tables.
      const [expiredRejections] = await conn.execute(
        `
        SELECT DISTINCT rt.table_id, r.reservation_id 
        FROM reservations r
        JOIN payments p ON r.reservation_id = p.reservation_id
        LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
        WHERE p.payment_status = 'rejected'
          AND p.rejected_at < NOW() - INTERVAL 12 HOUR
          AND r.status = 'rejected'
      `,
      );

      if (expiredRejections.length > 0) {
        // Collect unique reservation IDs to modify
        const resIds = [
          ...new Set(expiredRejections.map((i) => i.reservation_id)),
        ];
        const tableIds = expiredRejections
          .map((i) => i.table_id)
          .filter(Boolean);

        // Cancel reservations
        await conn.query(
          "UPDATE reservations SET status = 'Cancelled' WHERE reservation_id IN (?)",
          [resIds],
        );

        // Expire the payments record status
        await conn.query(
          "UPDATE payments SET payment_status = 'expired' WHERE reservation_id IN (?)",
          [resIds],
        );

        // Terminate reservation table bindings
        await conn.query(
          "UPDATE reservation_tables SET status = 'cancelled' WHERE reservation_id IN (?)",
          [resIds],
        );

        // Make the assigned tables available on the floor again
        if (tableIds.length > 0) {
          await conn.query(
            "UPDATE tables SET status = 'available', available_seats = capacity WHERE table_id IN (?)",
            [tableIds],
          );
        }

        console.log(
          `✅ Automatically cancelled ${resIds.length} expired reservation(s) due to 12-hour unpaid window.`,
        );
      }

      /* --- 6. 1-HOUR PER-TABLE RESERVATION REMINDER ---
      try {
        const [dueReminders] = await conn.execute(
          `
          SELECT
            r.reservation_id,
            r.user_id,
            r.email,
            r.first_name,
            r.last_name,
            r.reservation_date,
            r.reservation_time
          FROM reservations r
          WHERE COALESCE(r.reservation_type, 'per_table') = 'per_table'
            AND r.status = 'Confirmed'
            AND r.user_id IS NOT NULL
            AND r.email IS NOT NULL 
            AND r.email <> ''
            
            // Convert the Manila reservation time to UTC, and compare against UTC NOW() //
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) > UTC_TIMESTAMP()
                
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)
                
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
                
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.reservation_id = r.reservation_id
                AND n.user_id = r.user_id
                AND n.title = 'Upcoming Reservation Reminder'
            )
          `,
        );

        for (const row of dueReminders) {
          // Format the time for the message: "3:00 PM"
          const [hh, mm] = String(row.reservation_time).slice(0, 5).split(":");
          const hour24 = Number(hh);
          const suffix = hour24 >= 12 ? "PM" : "AM";
          const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
          const prettyTime = `${hour12}:${mm} ${suffix}`;

          await Notification.create(conn, {
            userId: row.user_id,
            reservationId: row.reservation_id,
            title: "Upcoming Reservation Reminder",
            message: `Reminder: You have a table reservation today at ${prettyTime}. We look forward to seeing you at HANGOUT Resto Bar!`,
            type: "reservation",
            isAdminAlert: false,
          });

          try {
            const emailResult = await sendReminderEmail({
              toEmail: row.email,
              toName: `${row.first_name} ${row.last_name || ""}`.trim(),
              reservationTime: prettyTime,
            });

            if (emailResult?.success) {
              console.log(
                `📧 Email reminder sent to ${row.email} (id: ${emailResult.messageId})`,
              );
            } else {
              console.error(
                `❌ Reminder email failed for ${row.email}:`,
                emailResult?.error,
              );
            }
          } catch (emailErr) {
            console.error("Email service error:", emailErr.message);
          }

          console.log(
            `🔔 1-hour reminder sent to user ${row.user_id} for ${row.reservation_id} (${prettyTime})`,
          );
        }
      } catch (reminderErr) {
        // Non-blocking: one bad reminder must never abort the status sync.
        console.error("1-hour reminder error:", reminderErr.message);
      }*/

      // --- 6. 5-MINUTE PER-TABLE RESERVATION REMINDER (TEST MODE) ---
      try {
        const [dueReminders] = await conn.execute(
          `
          SELECT
            r.reservation_id,
            r.user_id,
            r.email,
            r.first_name,
            r.last_name,
            r.reservation_date,
            r.reservation_time
          FROM reservations r
          WHERE COALESCE(r.reservation_type, 'per_table') = 'per_table'
            AND r.status = 'Confirmed'
            AND r.user_id IS NOT NULL
            AND r.email IS NOT NULL 
            AND r.email <> ''
            
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) > UTC_TIMESTAMP()
                
            // LOOK FOR RESERVATIONS HAPPENING WITHIN THE NEXT 5 MINUTES //
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) 
                
            AND CONVERT_TZ(
                  TIMESTAMP(r.reservation_date, r.reservation_time), 
                  '+08:00', '+00:00'
                ) > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
                
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.reservation_id = r.reservation_id
                AND n.user_id = r.user_id
                AND n.title = 'Upcoming Reservation Reminder'
            )
          `,
        );

        for (const row of dueReminders) {
          const [hh, mm] = String(row.reservation_time).slice(0, 5).split(":");
          const hour24 = Number(hh);
          const suffix = hour24 >= 12 ? "PM" : "AM";
          const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
          const prettyTime = `${hour12}:${mm} ${suffix}`;

          await Notification.create(conn, {
            userId: row.user_id,
            reservationId: row.reservation_id,
            title: "Upcoming Reservation Reminder",
            message: `Reminder: You have a table reservation today at ${prettyTime}. We look forward to seeing you at HANGOUT Resto Bar!`,
            type: "reservation",
            isAdminAlert: false,
          });

          try {
            const emailResult = await sendReminderEmail({
              toEmail: row.email,
              toName: `${row.first_name} ${row.last_name || ""}`.trim(),
              reservationTime: prettyTime,
            });

            if (emailResult?.success) {
              console.log(`📧 Email sent to ${row.email}`);
            }
          } catch (emailErr) {
            console.error("Email service error:", emailErr.message);
          }

          console.log(`🔔 5-min reminder sent for ${row.reservation_id}`);
        }
      } catch (reminderErr) {
        console.error("Reminder error:", reminderErr.message);
      }

      // --- 7. Notification Cleanup ---
      await Notification.permanentlyDeleteExpired();

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      console.error("❌ Cron sync error:", error);
    } finally {
      conn.release();
    }
  });
};

module.exports = startCronJobs;
