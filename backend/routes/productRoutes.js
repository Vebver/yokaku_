const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload'); // Import multer setup

router.get('/', productController.getProducts); 
router.post('/', upload.single('image'), productController.createProduct); // Use multer middleware for file upload
router.delete('/:id', productController.deleteProduct);

module.exports = router;