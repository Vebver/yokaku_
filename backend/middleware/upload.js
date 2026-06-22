const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Setup Cloudinary Storage instead of diskStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'receipts', // The folder name in your Cloudinary dashboard
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // Transformation is optional (resizes image to save space)
    transformation: [{ width: 800, height: 800, crop: 'limit' }] 
  },
});

// 3. Initialize multer with Cloudinary storage
const upload = multer({ storage: storage });

module.exports = upload;