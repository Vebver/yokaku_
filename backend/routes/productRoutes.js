const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require('../middleware/upload'); 

// --- PUBLIC ROUTES (No login required) ---
router.get('/', productController.getProducts); 
router.get('/featured', productController.getFeaturedProducts);

// --- ADMIN ONLY ROUTES (Must be logged in AND be an admin) ---

// Ingredient Management
router.get('/:id/ingredients', protect, adminOnly, productController.getIngredients);
router.post('/:id/ingredients', protect, adminOnly, productController.addIngredient);
router.delete('/ingredients/:recipeId', protect, adminOnly, productController.removeIngredient);

// Product Management
router.post('/', protect, adminOnly, upload.single('image'), productController.createProduct);
router.put('/:id/feature', protect, adminOnly, productController.toggleFeature);
router.put('/:id', protect, adminOnly, upload.single('image'), productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;