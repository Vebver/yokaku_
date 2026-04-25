const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventory);
router.post('/', inventoryController.createInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;    