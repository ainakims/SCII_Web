const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getAllItems);
router.post('/restock', inventoryController.addLote);
router.get('/kardex', inventoryController.getKardex);
router.post('/prescribe', inventoryController.prescribeAndDiscount);

module.exports = router;
