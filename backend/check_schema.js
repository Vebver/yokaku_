// Temporary diagnostic script: prints the current columns of the `payments` table
const db = require("./config/db");

(async () => {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM payments");
    console.log("=== Current `payments` columns ===");
    rows.forEach((r) => console.log(`- ${r.Field} (${r.Type}) default=${r.Default}`));

    const expected = [
      "payment_id",
      "reservation_id",
      "amount",
      "payment_method",
      "payment_status",
      "paid_at",
      "total_bill",
      "rejection_reason",
      "rejected_at",
    ];
    const existing = new Set(rows.map((r) => r.Field));
    console.log("\n=== Missing columns ===");
    expected.forEach((col) => {
      if (!existing.has(col)) console.log(`- ${col}`);
    });
    console.log("\nDone.");
    process.exit(0);
  } catch (err) {
    console.error("Schema check failed:", err.message);
    process.exit(1);
  }
})();

