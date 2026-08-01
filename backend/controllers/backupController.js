const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const util = require("util");
const db = require("../config/db");
const { logActivity } = require("../utils/logger");

const execPromise = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, "..", "backups");

// ──────────────────────────────────────────────
// BACKUP ENGINE SELECTION
// ──────────────────────────────────────────────
//   "node" (default) — programmatic dump/restore through the mysql2 driver.
//                      No local MySQL CLI binaries are needed. This is the only
//                      method that supports MySQL 8's `caching_sha2_password`
//                      auth plugin (used by Railway / Render managed MySQL).
//   "cli"             — use the mysqldump/mysql CLI binaries (auto-detected or
//                      set via MYSQLDUMP_PATH / MYSQL_PATH).
const BACKUP_METHOD = (process.env.BACKUP_METHOD || "node").toLowerCase();

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ──────────────────────────────────────────────
// BINARY RESOLUTION (mysqldump / mysql)
// ──────────────────────────────────────────────
// Only needed when BACKUP_METHOD=cli. On some systems (notably Windows/XAMPP),
// the MySQL CLI tools are installed but NOT on the system PATH, which makes
// `exec("mysqldump ...")` fail. We resolve the binaries from:
//   1. Explicit env overrides (MYSQLDUMP_PATH / MYSQL_PATH)
//   2. Common install directories (XAMPP, WAMP, Laragon, MySQL, MariaDB, ...)
//   3. The bare command name (falls back to relying on PATH)
function resolveTool(candidates, envOverride) {
  const exe = process.platform === "win32" ? ".exe" : "";

  // 1) Explicit env override (auto-append .exe on Windows for convenience)
  if (envOverride) {
    const check =
      process.platform === "win32" && !envOverride.toLowerCase().endsWith(".exe")
        ? envOverride + ".exe"
        : envOverride;
    if (fs.existsSync(check)) return check;
    console.warn(`[backup] Env override not found (${envOverride}), trying auto-detection...`);
  }

  // 2) Known install directories
  const searchRoots = [
    "C:\\xampp\\mysql\\bin",
    "C:\\wamp64\\bin\\mysql",
    "C:\\wamp\\bin\\mysql",
    "C:\\laragon\\bin\\mysql",
    "C:\\Program Files\\MySQL",
    "C:\\Program Files\\MariaDB",
    "C:\\Program Files (x86)\\MySQL",
    "C:\\Program Files (x86)\\MariaDB",
    "C:\\tools\\mysql",
    "/usr/bin",
    "/usr/local/mysql/bin",
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ];

  const candidateDirs = [];
  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;

    // Root itself contains the binary (e.g. C:\xampp\mysql\bin)
    if (candidates.some((n) => fs.existsSync(path.join(root, n + exe)))) {
      candidateDirs.push(root);
      continue;
    }

    // Otherwise scan one level deep for versioned installs
    // (e.g. C:\Program Files\MySQL\MySQL Server 8.0\bin)
    try {
      for (const sub of fs.readdirSync(root)) {
        const binDir = path.join(root, sub, "bin");
        if (fs.existsSync(binDir) && candidates.some((n) => fs.existsSync(path.join(binDir, n + exe)))) {
          candidateDirs.push(binDir);
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }

  if (candidateDirs.length > 0) {
    for (const name of candidates) {
      const full = path.join(candidateDirs[0], name + exe);
      if (fs.existsSync(full)) return full;
    }
  }

  // 3) Fallback: rely on PATH
  return candidates[0];
}

const mysqldumpBin = resolveTool(["mysqldump", "mariadb-dump"], process.env.MYSQLDUMP_PATH);
const mysqlBin = resolveTool(["mysql", "mariadb"], process.env.MYSQL_PATH);

// Startup diagnostics
console.log(`[backup] Backup method: ${BACKUP_METHOD === "cli" ? "CLI (mysqldump/mysql)" : "Node (mysql2 driver)"}`);
console.log(`[backup] Using mysqldump: ${mysqldumpBin}`);
console.log(`[backup] Using mysql: ${mysqlBin}`);
if (mysqldumpBin === "mysqldump" && !fs.existsSync(mysqldumpBin)) {
  console.warn(
    "[backup] 'mysqldump' was not found in common install paths. CLI backups rely on PATH. If backups fail, set MYSQLDUMP_PATH to the full path of mysqldump.",
  );
}
if (mysqlBin === "mysql" && !fs.existsSync(mysqlBin)) {
  console.warn(
    "[backup] 'mysql' was not found in common install paths. CLI restores rely on PATH. If restores fail, set MYSQL_PATH to the full path of mysql.",
  );
}

// ──────────────────────────────────────────────
// STREAM HELPERS
// ──────────────────────────────────────────────
function writeStreamChunk(stream, chunk) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      stream.off("drain", onDrain);
      reject(err);
    };
    const onDrain = () => {
      stream.off("error", onError);
      resolve();
    };
    if (stream.write(chunk)) {
      resolve();
    } else {
      stream.once("drain", onDrain);
      stream.once("error", onError);
    }
  });
}

function endWriteStream(stream) {
  return new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
}

// ──────────────────────────────────────────────
// SQL HELPERS (used by programmatic backup/restore)
// ──────────────────────────────────────────────

// Escape a single value for use inside an INSERT statement.
function escapeValue(conn, value) {
  if (typeof value === "bigint") return value.toString();
  return conn.escape(value);
}

// Remove DEFINER=... clauses from views/triggers/routines so that restoring
// on a database without that exact user does not fail.
function stripDefiners(sql) {
  return sql
    .replace(/DEFINER=`[^`]+`@`[^`]+`/g, "")
    .replace(/DEFINER='[^']+'@'[^']+'/g, "")
    .replace(/DEFINER=[^\s]+/g, "");
}

// Split a .sql dump file into individual executable statements.
// Handles: quoted strings (', ", `), escape sequences, line/block comments,
// MySQL version comments (/*! ... */) and DELIMITER directives (used for
// triggers/routines/views generated by both mysqldump and this module).
function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let delimiter = ";";
  let i = 0;
  const n = sql.length;

  const isCommentOnly = (stmt) => {
    const cleaned = stmt
      .replace(/^\s*--.*$/gm, "")
      .replace(/\/\*(?!\!)[\s\S]*?\*\//g, "")
      .trim();
    return cleaned === "";
  };

  while (i < n) {
    // DELIMITER directive at start of a statement
    if (current.trim() === "") {
      const m = sql.slice(i).match(/^DELIMITER\s+(\S+)/i);
      if (m) {
        delimiter = m[1];
        current = "";
        i += m[0].length;
        continue;
      }
    }

    const ch = sql[i];

    if (delimiter === ";") {
      // Quote-aware scanning for the ';' delimiter
      if (ch === "'" || ch === '"' || ch === "`") {
        const q = ch;
        let j = i;
        current += ch;
        j++;
        while (j < n) {
          const c = sql[j];
          current += c;
          if (c === "\\" && j + 1 < n) {
            current += sql[j + 1];
            j += 2;
            continue;
          }
          if (c === q) {
            j++;
            break;
          }
          j++;
        }
        i = j;
        continue;
      }
      // Line comments (-- and #)
      if (ch === "-" && sql[i + 1] === "-") {
        while (i < n && sql[i] !== "\n") i++;
        continue;
      }
      if (ch === "#") {
        while (i < n && sql[i] !== "\n") i++;
        continue;
      }
      // Block comments: skip plain /* */ but KEEP MySQL version comments /*! ... */
      if (ch === "/" && sql[i + 1] === "*") {
        const isVersionComment = sql[i + 2] === "!";
        if (!isVersionComment) {
          i += 2;
          while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
          i += 2;
          continue;
        }
        current += ch;
        i++;
        continue;
      }
      // Statement terminator
      if (ch === ";") {
        const stmt = current.trim();
        if (stmt && !isCommentOnly(stmt)) {
          statements.push(stmt);
        }
        current = "";
        i++;
        continue;
      }
      current += ch;
      i++;
    } else {
      // Custom delimiter (e.g. $$) — find it verbatim
      if (sql.startsWith(delimiter, i)) {
        const stmt = current.trim();
        if (stmt && !isCommentOnly(stmt)) {
          statements.push(stmt);
        }
        current = "";
        i += delimiter.length;
        continue;
      }
      current += ch;
      i++;
    }
  }

  const last = current.trim();
  if (last && !isCommentOnly(last)) {
    statements.push(last);
  }

  return statements;
}

// ──────────────────────────────────────────────
// PROGRAMMATIC BACKUP (mysql2 driver)
// ──────────────────────────────────────────────
async function createProgrammaticBackup(filepath) {
  const conn = await db.getConnection();
  const dbName = process.env.DB_NAME;
  const writeStream = fs.createWriteStream(filepath);

  try {
    const header = [
      "-- ---------------------------------------------------------------------",
      "-- Yokaku Database Backup (generated programmatically via mysql2)",
      `-- Database: ${dbName}`,
      `-- Generated: ${new Date().toISOString()}`,
      "-- ---------------------------------------------------------------------",
      "",
      "SET FOREIGN_KEY_CHECKS=0;",
      "SET NAMES utf8mb4;",
      "",
    ].join("\n");
    await writeStreamChunk(writeStream, header);

    // Gather schema objects
    const [tables] = await conn.query(
      "SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME",
      [dbName],
    );

    const baseTables = tables.filter((t) => t.type === "BASE TABLE");
    const views = tables.filter((t) => t.type === "VIEW");

    // 1) Base tables: DROP + CREATE + data (chunked inserts)
    for (const table of baseTables) {
      const t = table.name;
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
      const createSql = createRows[0]["Create Table"];

      await writeStreamChunk(writeStream, `DROP TABLE IF EXISTS \`${t}\`;\n`);
      await writeStreamChunk(writeStream, `${createSql};\n\n`);

      const [rows] = await conn.query(`SELECT * FROM \`${t}\``);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0])
        .map((c) => `\`${c}\``)
        .join(", ");

      const chunkSize = 200;
      for (let start = 0; start < rows.length; start += chunkSize) {
        const chunk = rows.slice(start, start + chunkSize);
        const valueLines = chunk.map((row) => {
          const values = Object.keys(row).map((key) => escapeValue(conn, row[key]));
          return `(${values.join(", ")})`;
        });
        await writeStreamChunk(
          writeStream,
          `INSERT INTO \`${t}\` (${columns}) VALUES\n${valueLines.join(",\n")};\n\n`,
        );
      }
    }

    // 2) Views
    for (const view of views) {
      const v = view.name;
      const [createRows] = await conn.query(`SHOW CREATE VIEW \`${v}\``);
      const createSql = stripDefiners(createRows[0]["Create View"]);

      await writeStreamChunk(writeStream, `DROP VIEW IF EXISTS \`${v}\`;\n`);
      await writeStreamChunk(writeStream, `${createSql};\n\n`);
    }

    // 3) Triggers
    const [triggers] = await conn.query(
      `SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing, EVENT_MANIPULATION AS event,
              EVENT_OBJECT_TABLE AS table_name, ACTION_STATEMENT AS statement
       FROM information_schema.triggers WHERE trigger_schema = ?`,
      [dbName],
    );
    for (const trg of triggers) {
      const stmt = stripDefiners(trg.statement);
      await writeStreamChunk(
        writeStream,
        [
          `DELIMITER $$`,
          `DROP TRIGGER IF EXISTS \`${trg.name}\`$$`,
          `CREATE TRIGGER \`${trg.name}\` ${trg.timing} ${trg.event} ON \`${trg.table_name}\` FOR EACH ROW ${stmt}$$`,
          `DELIMITER ;`,
          ``,
        ].join("\n") + "\n",
      );
    }

    // 4) Routines (procedures & functions)
    const [routines] = await conn.query(
      `SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type
       FROM information_schema.routines WHERE routine_schema = ?`,
      [dbName],
    );
    for (const routine of routines) {
      if (routine.type === "PROCEDURE") {
        const [r] = await conn.query(`SHOW CREATE PROCEDURE \`${routine.name}\``);
        const sql = stripDefiners(r[0]["Create Procedure"]);
        await writeStreamChunk(
          writeStream,
          [
            `DELIMITER $$`,
            `DROP PROCEDURE IF EXISTS \`${routine.name}\`$$`,
            `${sql}$$`,
            `DELIMITER ;`,
            ``,
          ].join("\n") + "\n",
        );
      } else if (routine.type === "FUNCTION") {
        const [r] = await conn.query(`SHOW CREATE FUNCTION \`${routine.name}\``);
        const sql = stripDefiners(r[0]["Create Function"]);
        await writeStreamChunk(
          writeStream,
          [
            `DELIMITER $$`,
            `DROP FUNCTION IF EXISTS \`${routine.name}\`$$`,
            `${sql}$$`,
            `DELIMITER ;`,
            ``,
          ].join("\n") + "\n",
        );
      }
    }

    await writeStreamChunk(writeStream, "\nSET FOREIGN_KEY_CHECKS=1;\n");
    await endWriteStream(writeStream);
  } catch (err) {
    writeStream.destroy();
    throw err;
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────
// PROGRAMMATIC RESTORE (mysql2 driver)
// ──────────────────────────────────────────────
async function restoreProgrammaticBackup(filepath) {
  const content = fs.readFileSync(filepath, "utf8");
  const statements = splitSqlStatements(content);

  const conn = await db.getConnection();
  try {
    await conn.query("SET NAMES utf8mb4");
    await conn.query("SET FOREIGN_KEY_CHECKS=0");

    for (const rawStmt of statements) {
      const stmt = stripDefiners(rawStmt);
      if (!stmt) continue;
      await conn.query(stmt);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────
// CLI BACKUP / RESTORE (mysqldump / mysql)
// ──────────────────────────────────────────────
async function createCliBackup(filepath) {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  // Build mysqldump command — without --password flag to avoid CLI warnings
  const dumpCmd = [
    `"${mysqldumpBin}"`,
    `--host=${DB_HOST}`,
    `--user=${DB_USER}`,
    `--port=${DB_PORT || 3306}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--add-drop-table",
    DB_NAME,
    `> "${filepath}"`,
  ]
    .filter(Boolean)
    .join(" ");

  // Pass the password securely inside the environment variables
  await execPromise(dumpCmd, {
    env: {
      ...process.env,
      MYSQL_PWD: DB_PASSWORD,
    },
  });
}

async function restoreCliBackup(filepath) {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  // Build mysql restore command — without --password flag to avoid CLI warnings
  const restoreCmd = [
    `"${mysqlBin}"`,
    `--host=${DB_HOST}`,
    `--user=${DB_USER}`,
    `--port=${DB_PORT || 3306}`,
    DB_NAME,
    `< "${filepath}"`,
  ]
    .filter(Boolean)
    .join(" ");

  // Pass password securely via env variables context
  await execPromise(restoreCmd, {
    env: {
      ...process.env,
      MYSQL_PWD: DB_PASSWORD,
    },
  });
}

// ──────────────────────────────────────────────
// CONTROLLER
// ──────────────────────────────────────────────
const backupController = {
  // ──────────────────────────────────────────────
  // 1. CREATE BACKUP
  // ──────────────────────────────────────────────
  createBackup: async (req, res) => {
    try {
      const timestamp = Date.now();
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      if (BACKUP_METHOD === "cli") {
        await createCliBackup(filepath);
      } else {
        await createProgrammaticBackup(filepath);
      }

      // Verify backup was created
      if (!fs.existsSync(filepath)) {
        throw new Error("Backup file was not created.");
      }

      const stats = fs.statSync(filepath);
      const sizeInBytes = stats.size;

      if (sizeInBytes === 0) {
        throw new Error("Backup file is empty (0 bytes). No tables backed up?");
      }

      await logActivity(
        req.user?.userId || null,
        "CREATE_DATABASE_BACKUP",
        null,
        {
          filename,
          size_bytes: sizeInBytes,
          message: `Database backup created: ${filename} (${(sizeInBytes / 1024 / 1024).toFixed(2)} MB)`,
        },
        req,
      );

      res.status(201).json({
        message: `Backup created successfully: ${filename}`,
        filename,
        size_bytes: sizeInBytes,
        size_mb: (sizeInBytes / 1024 / 1024).toFixed(2),
      });
    } catch (error) {
      console.error("Create Backup Error:", error);
      const detail = error.message || String(error);
      res.status(500).json({
        error: "Failed to create database backup.",
        detail: detail.includes("ENOENT")
          ? `Could not find mysqldump at '${mysqldumpBin}'. Set MYSQLDUMP_PATH in your .env to the full path of mysqldump (e.g. C:\\xampp\\mysql\\bin\\mysqldump.exe) or switch to the default BACKUP_METHOD=node.`
          : detail,
      });
    }
  },

  // ──────────────────────────────────────────────
  // 2. LIST BACKUPS
  // ──────────────────────────────────────────────
  listBackups: async (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return res.json({ backups: [] });
      }

      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql"));

      const backups = files
        .map((filename) => {
          const filepath = path.join(BACKUP_DIR, filename);
          try {
            const stats = fs.statSync(filepath);
            return {
              filename,
              size_bytes: stats.size,
              size_mb: (stats.size / 1024 / 1024).toFixed(2),
              created_at: stats.birthtime || stats.mtime,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest first

      res.json({ backups });
    } catch (error) {
      console.error("List Backups Error:", error);
      res.status(500).json({ error: "Failed to list backups." });
    }
  },

  // ──────────────────────────────────────────────
  // 3. RESTORE BACKUP
  // ──────────────────────────────────────────────
  restoreBackup: async (req, res) => {
    const { filename } = req.params;

    // Security: prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename." });
    }

    const filepath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: `Backup file '${filename}' not found.` });
    }

    try {
      if (BACKUP_METHOD === "cli") {
        await restoreCliBackup(filepath);
      } else {
        await restoreProgrammaticBackup(filepath);
      }

      await logActivity(
        req.user?.userId || null,
        "RESTORE_DATABASE_BACKUP",
        null,
        {
          filename,
          message: `Database restored from backup: ${filename}`,
        },
        req,
      );

      res.json({
        message: `Database restored successfully from: ${filename}`,
        filename,
      });
    } catch (error) {
      console.error("Restore Backup Error:", error);
      const detail = error.message || String(error);
      res.status(500).json({
        error: "Failed to restore database backup.",
        detail: detail.includes("ENOENT")
          ? `Could not find mysql at '${mysqlBin}'. Set MYSQL_PATH in your .env to the full path of mysql (e.g. C:\\xampp\\mysql\\bin\\mysql.exe) or switch to the default BACKUP_METHOD=node.`
          : detail,
      });
    }
  },

  // ──────────────────────────────────────────────
  // 4. DELETE BACKUP
  // ──────────────────────────────────────────────
  deleteBackup: async (req, res) => {
    const { filename } = req.params;

    // Security: prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename." });
    }

    const filepath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: `Backup file '${filename}' not found.` });
    }

    try {
      fs.unlinkSync(filepath);

      await logActivity(
        req.user?.userId || null,
        "DELETE_DATABASE_BACKUP",
        null,
        {
          filename,
          message: `Backup file deleted: ${filename}`,
        },
        req,
      );

      res.json({ message: `Backup '${filename}' deleted successfully.` });
    } catch (error) {
      console.error("Delete Backup Error:", error);
      res.status(500).json({ error: "Failed to delete backup file." });
    }
  },

  // ──────────────────────────────────────────────
  // 5. DOWNLOAD BACKUP
  // ──────────────────────────────────────────────
  downloadBackup: async (req, res) => {
    const { filename } = req.params;

    // Security: prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename." });
    }

    const filepath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: `Backup file '${filename}' not found.` });
    }

    try {
      res.download(filepath, filename);
    } catch (error) {
      console.error("Download Backup Error:", error);
      res.status(500).json({ error: "Failed to download backup file." });
    }
  },
};

module.exports = backupController;

