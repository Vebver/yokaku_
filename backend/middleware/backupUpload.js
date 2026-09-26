const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const tempDir = path.join(os.tmpdir(), "yokaku-backup-uploads");
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: tempDir,
    filename: (req, file, callback) => {
      callback(null, `${Date.now()}-${crypto.randomUUID()}.sql`);
    },
  }),
  limits: { fileSize: 512 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== ".sql") {
      return callback(new Error("Only .sql backup files are allowed."));
    }
    callback(null, true);
  },
});

const parseSqlBackup = upload.single("backup");

module.exports = (req, res, next) => {
  parseSqlBackup(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Backup file exceeds the 512 MB upload limit."
          : error.message;
      return res.status(400).json({ error: message });
    }
    next();
  });
};