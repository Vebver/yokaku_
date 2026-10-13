const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', inventoryController.getInventory);
router.post('/', inventoryController.createInventoryItem);
router.put('/:id', inventoryController.updateInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);

// Dynamic unit & storage-location options.
// Static paths are declared BEFORE "/:id" so "units" is never parsed as an id.
router.get('/units', inventoryController.getUnits);
router.post('/units', protect, adminOnly, inventoryController.addUnit);
router.delete('/units/:name', protect, adminOnly, inventoryController.deleteUnit);
router.get('/storage-locations', inventoryController.getStorageLocations);
router.post('/storage-locations', protect, adminOnly, inventoryController.addStorageLocation);
router.delete('/storage-locations/:name', protect, adminOnly, inventoryController.deleteStorageLocation);

// Dish links for an existing inventory item (Link Dishes modal).
router.get('/:id/dish-links', protect, adminOnly, inventoryController.getDishLinks);
router.post('/:id/dish-links', protect, adminOnly, inventoryController.addDishLink);
router.delete('/:id/dish-links/:itemId', protect, adminOnly, inventoryController.removeDishLink);

module.exports = router;    