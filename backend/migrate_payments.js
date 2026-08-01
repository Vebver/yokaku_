/* MIGRATION SCRIPT - adds missing columns to payments table (idempotent) */
require("dotenv").config();
const mysql = require("mysql2/promise");

const args = process.argv.slice(2);
const isLocal = args.indexOf("--local") !== -1;

const config = {
  host: isLocal ? (process.env.DB_LOCAL_HOST || "localhost") : process.env.DB_HOST,
  user: isLocal ? (process.env.DB_LOCAL_USER || "root") : process.env.DB_USER,
  password: isLocal ? (process.env.DB_LOCAL_PASSWORD || "") : process.env.DB_PASSWORD,
  database: isLocal ? (process.env.DB_LOCAL_NAME || "yoyaku_db") : process.env.DB_NAME,
  port: parseInt(isLocal ? (process.env.DB_LOCAL_PORT || 3306) : (process.env.DB_PORT || 3306), 10),
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  charset: "utf8mb4",
  connectTimeout: 60000
};

const EXPECTED_COLUMNS = [
  { name: "paid_at", ddl: "ALTER TABLE `payments` ADD COLUMN `paid_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP" },
  { name: "total_bill", ddl: "ALTER TABLE `payments` ADD COLUMN `total_bill` DECIMAL(12,2) DEFAULT 0.00" },
  { name: "rejection_reason", ddl: "ALTER TABLE `payments` ADD COLUMN `rejection_reason` TEXT NULL" },
  { name: "rejected_at", ddl: "ALTER TABLE `payments` ADD COLUMN `rejected_at` TIMESTAMP NULL DEFAULT NULL" }
];

// Columns that are no longer used and should be removed from the table
const COLUMNS_TO_DROP = [
  { name: "payment_reference", ddl: "ALTER TABLE `payments` DROP COLUMN `payment_reference`" }
];

(async function main() {
  let conn = null;
  try {
    const where = isLocal ? "LOCAL" : "REMOTE";
    console.log("[migrate_payments] Connecting to " + where + " DB @ " + config.host + ":" + config.port + "/" + config.database);
    conn = await mysql.createConnection(config);
    console.log("[migrate_payments] Connected.\n");

    const [cols] = await conn.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments'",
      [config.database]
    );
    const existing = new Set(cols.map(function (c) { return c.COLUMN_NAME; }));
    console.log("[migrate_payments] Current `payments` columns: " + (existing.size ? Array.from(existing).sort().join(", ") : "(none)") + "\n");

    let changed = false;
    for (let i = 0; i < EXPECTED_COLUMNS.length; i++) {
      const item = EXPECTED_COLUMNS[i];
      if (existing.has(item.name)) {
        console.log("  = Column exists: " + item.name);
      } else {
        console.log("  + Adding missing column: " + item.name);
        await conn.query(item.ddl);
        changed = true;
      }
    }

    // Drop unused columns
    for (let i = 0; i < COLUMNS_TO_DROP.length; i++) {
      const item = COLUMNS_TO_DROP[i];
      if (existing.has(item.name)) {
        console.log("  - Dropping unused column: " + item.name);
        await conn.query(item.ddl);
        changed = true;
      } else {
        console.log("  = Column already absent: " + item.name);
      }
    }

    if (changed) {
      console.log("\n[migrate_payments] Schema updated.");
    } else {
      console.log("\n[migrate_payments] No changes needed - all columns already present.");
    }
  } catch (err) {
    console.error("[migrate_payments] Error: " + err.message);
    process.exitCode = 1;
  } finally {
    if (conn) { await conn.end(); }
  }
})();

