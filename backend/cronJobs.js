// backend/cronJobs.js
const cron = require("node-cron");
const db = require("./config/db");

// Run every minute to check for ongoing reservations
const startCronJobs = () => {
  console.log("🕐 Starting reservation status cron job...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDate = now.toISOString().split("T")[0];

      // Update Confirmed/Pending to Seated when current time is between start and end
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

      // Update Seated to Completed when current time is past end time
      const updateToCompleted = `
        UPDATE reservations 
        SET status = 'Completed' 
        WHERE reservation_date = ? 
        AND status = 'Seated'
        AND end_time < ?
      `;

      const [completedResult] = await db.execute(updateToCompleted, [
        currentDate,
        currentTime,
      ]);

      if (seatedResult.affectedRows > 0 || completedResult.affectedRows > 0) {
        console.log(
          `✅ [${new Date().toLocaleTimeString()}] Updated ${seatedResult.affectedRows} to Seated, ${completedResult.affectedRows} to Completed`,
        );
      }
    } catch (error) {
      console.error("❌ Cron job error:", error);
    }
  });

  console.log("✅ Reservation status cron job started (runs every minute)");
};

module.exports = startCronJobs;
