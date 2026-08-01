const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const util = require("util");
const { logActivity } = require("../utils/logger");

const execPromise = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, "..", "backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupController = {
  // ──────────────────────────────────────────────
  // 1. CREATE BACKUP
  // ──────────────────────────────────────────────
  createBackup: async (req, res) => {
    try {
      const timestamp = Date.now();
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

      // Build mysqldump command — without --password flag to avoid CLI warnings
      const dumpCmd = [
        "mysqldump",
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

      // Verify backup was created
      if (!fs.existsSync(filepath)) {
        throw new Error("Backup file was not created.");
      }

      const stats = fs.statSync(filepath);
      const sizeInBytes = stats.size;

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
      res.status(500).json({ error: "Failed to create database backup. Ensure mysqldump is installed and accessible." });
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
      const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

      // Build mysql restore command — without --password flag to avoid CLI warnings
      const restoreCmd = [
        "mysql",
        `--host=${DB_HOST}`,
        `--user=${DB_USER}`,
        `--port=${DB_PORT || 3306}`,
        DB_NAME,
        `< "${filepath}"`,
      ]
        .filter(Boolean)
        .join(" ");

      // Pass password securely via env variables context (Runs exactly once)
      await execPromise(restoreCmd, {
        env: {
          ...process.env,
          MYSQL_PWD: DB_PASSWORD,
        },
      });

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
      res.status(500).json({ error: "Failed to restore database backup. Ensure mysql CLI is installed and accessible." });
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