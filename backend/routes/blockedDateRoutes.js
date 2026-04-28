const express = require('express');
const router = express.Router();
const blockedDateController = require('../controllers/blockedDateController');

router.get('/', blockedDateController.list);
router.post('/', blockedDateController.add);
router.delete('/:id', blockedDateController.remove);

module.exports = router;