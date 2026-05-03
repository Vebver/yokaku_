const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  // --- THESE 4 SETTINGS ARE CRITICAL FOR RENDER + RAILWAY ---
  ssl: {
    rejectUnauthorized: false, // Required for secure cloud connection
  },
  maxAllowedPacket: 67108864,   // 64MB (Stops "Malformed Packet" errors)
  charset: 'utf8mb4',          // Handles special characters in item names
  connectTimeout: 30000,       // Gives the connection 30 seconds to wake up
  // ---------------------------------------------------------
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
}).on('connection', (connection) => {
    connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
});

module.exports = pool;