const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage - save to frontend/public/uploads
const uploadsDir = path.join(__dirname, '../../frontend/public/uploads');

// Ensure directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Create the upload instance
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Optional: Limit to 5MB
});

// Export it so other files can use it
module.exports = upload;