const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Convert port to a number, as strings can sometimes cause connection issues
  port: parseInt(process.env.DB_PORT, 10) || 3306, 
  ssl: {
    rejectUnauthorized: false, // Mandatory for Render -> Railway
  },
  charset: 'utf8mb4',         
  connectTimeout: 60000,      // Wait up to 60 seconds to connect
  waitForConnections: true,
  connectionLimit: 10,        // Removed duplicate
  queueLimit: 0,
  enableKeepAlive: true,      // Removed duplicate
  keepAliveInitialDelay: 10000,
});

// --- Run session setup on new connections ---
// Consolidated into a single listener with error handling to prevent crashes
pool.on('connection', (connection) => {
  connection.query(
    "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))",
    (err) => {
      if (err) {
        console.error("Failed to set SQL mode on new connection:", err.message);
      }
    }
  );
});

module.exports = pool;