const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // --- ADD THESE CRITICAL SETTINGS ---
  ssl: {
    rejectUnauthorized: false, // Required for many cloud DBs
  },
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxAllowedPacket: 67108864, // 64MB - fixes scrambled data
  connectTimeout: 20000,      // 20 seconds
}).on('connection', (connection) => {
    connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
});

module.exports = pool;