const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ──────────────────────────────────────────────
// LOCAL DISK STORAGE (reliable, always works)
// Files are saved to backend/uploads and served
// statically by Express at /uploads/...
//
// The Cloudinary URL (if it succeeds) is stored
// separately by productController as local_path.
// This guarantees the image is ALWAYS available
// from the local /uploads/... path even if the
// Cloudinary upload fails.
// ──────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

// Create the upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimeType = allowedTypes.test(file.mimetype);
    if (extName && mimeType) return cb(null, true);
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed."));
  },
});

module.exports = upload;
