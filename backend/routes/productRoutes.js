const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload'); // Import multer setup

router.get('/', productController.getProducts); 
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id/ingredients', productController.getIngredients);
router.post('/:id/ingredients', productController.addIngredient)
router.post('/', upload.single('image'), productController.createProduct); // Use multer middleware for file upload
router.put('/:id/feature', productController.toggleFeature);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.delete('/ingredients/:recipeId', productController.removeIngredient);


module.exports = router;