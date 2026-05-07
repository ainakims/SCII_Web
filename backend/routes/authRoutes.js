const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/LoginToken', authController.login);

module.exports = router;
