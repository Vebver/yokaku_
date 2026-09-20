/* MIGRATION SCRIPT - adds manual table availability override (idempotent) */
require("dotenv").config();
const mysql = require("mysql2/promise");

const isLocal = process.argv.includes("--local");
const config = {
  host: isLocal ? process.env.DB_LOCAL_HOST || "localhost" : process.env.DB_HOST,
  user: isLocal ? process.env.DB_LOCAL_USER || "root" : process.env.DB_USER,
  password: isLocal ? process.env.DB_LOCAL_PASSWORD || "" : process.env.DB_PASSWORD,
  database: isLocal ? process.env.DB_LOCAL_NAME || "yoyaku_db" : process.env.DB_NAME,
  port: Number.parseInt(isLocal ? process.env.DB_LOCAL_PORT || 3306 : process.env.DB_PORT || 3306, 10),
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
};

(async () => {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tables' AND COLUMN_NAME = 'manual_status'`,
      [config.database],
    );

    if (columns.length === 0) {
      await connection.execute(
        "ALTER TABLE tables ADD COLUMN manual_status ENUM('available', 'occupied') NULL AFTER status",
      );
      console.log("Added tables.manual_status");
    } else {
      console.log("tables.manual_status already exists");
    }
  } catch (error) {
    console.error("Table manual-status migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
})();
