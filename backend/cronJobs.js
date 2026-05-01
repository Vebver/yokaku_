// backend/cronJobs.js
const cron = require("node-cron");
const db = require("./config/db");
const Notification = require("./models/Notification");

// Run every minute to check for ongoing and expired reservations
const startCronJobs = () => {
  console.log("🕐 Starting reservation status cron job...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDate = now.toISOString().split("T")[0];

      console.log(`⏰ Running cron job at ${currentDate} ${currentTime}`);

      // 1. Update Confirmed/Pending to Seated when current time is between start and end
      const updateToSeated = `
        UPDATE reservations 
        SET status = 'Seated' 
        WHERE reservation_date = ? 
        AND status IN ('Confirmed', 'Pending')
        AND reservation_time <= ?
        AND end_time >= ?
      `;

      const [seatedResult] = await db.execute(updateToSeated, [
        currentDate,
        currentTime,
        currentTime,
      ]);

      // 2. Update Seated to Completed when current time is past end time
      const updateSeatedToCompleted = `
        UPDATE reservations 
        SET status = 'Completed' 
        WHERE reservation_date = ? 
        AND status = 'Seated'
        AND end_time < ?
      `;

      const [seatedToCompletedResult] = await db.execute(
        updateSeatedToCompleted,
        [currentDate, currentTime],
      );

      // 3. Update Confirmed/Pending to Completed when end time has passed (expired)
      const updateExpiredToCompleted = `
        UPDATE reservations 
        SET status = 'Completed' 
        WHERE reservation_date = ? 
        AND status IN ('Confirmed', 'Pending')
        AND end_time < ?
      `;

      const [expiredResult] = await db.execute(updateExpiredToCompleted, [
        currentDate,
        currentTime,
      ]);

      // 4. Update any reservations from past dates to Completed
      const updatePastDates = `
        UPDATE reservations 
        SET status = 'Completed' 
        WHERE reservation_date < ?
        AND status NOT IN ('Completed', 'Done', 'Rejected')
      `;

      const [pastDatesResult] = await db.execute(updatePastDates, [
        currentDate,
      ]);

      // 5. Permanently delete notifications that have been in trash for more than 30 days
      const deletedCount = await Notification.permanentlyDeleteExpired();

      if (deletedCount > 0) {
        console.log(
          `✅ Permanently deleted ${deletedCount} old notifications from trash`,
        );
      }

      // Log results if any changes were made
      if (
        seatedResult.affectedRows > 0 ||
        seatedToCompletedResult.affectedRows > 0 ||
        expiredResult.affectedRows > 0 ||
        pastDatesResult.affectedRows > 0
      ) {
        console.log(
          `✅ [${new Date().toLocaleTimeString()}] Updated: 
            - ${seatedResult.affectedRows} to Seated
            - ${seatedToCompletedResult.affectedRows} Seated to Completed
            - ${expiredResult.affectedRows} expired to Completed
            - ${pastDatesResult.affectedRows} past dates to Completed`,
        );
      }
    } catch (error) {
      console.error("❌ Cron job error:", error);
    }
  });

  console.log("✅ Reservation status cron job started (runs every minute)");
};

module.exports = startCronJobs;
