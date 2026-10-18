const mysql = require("mysql2/promise");
require("dotenv").config();

const sanitizeSqlValue = (value) => {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitizeSqlValue);
  if (value && typeof value === "object") {
    if (Buffer.isBuffer(value) || value instanceof Date) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeSqlValue(nestedValue),
      ]),
    );
  }
  return value;
};

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
  charset: "utf8mb4",
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

const wrapSqlMethod = (methodName, target) => {
  const original = target[methodName].bind(target);
  target[methodName] = (...args) => {
    if (args.length >= 2) {
      if (Array.isArray(args[1])) {
        args[1] = args[1].map(sanitizeSqlValue);
      } else if (args[1] && typeof args[1] === "object") {
        args[1] = sanitizeSqlValue(args[1]);
      }
    }
    return original(...args);
  };
};

wrapSqlMethod("execute", pool);
wrapSqlMethod("query", pool);

const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async (...args) => {
  const connection = await originalGetConnection(...args);
  wrapSqlMethod("execute", connection);
  wrapSqlMethod("query", connection);
  return connection;
};

// --- Run session setup on new connections ---
// Consolidated into a single listener with error handling to prevent crashes
pool.on("connection", (connection) => {
  connection.query(
    "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))",
    (err) => {
      if (err) {
        console.error("Failed to set SQL mode on new connection:", err.message);
      }
    },
  );
});

module.exports = pool;