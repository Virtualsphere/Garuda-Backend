const express = require('express');
const { loginUser } = require('../controller/authController');

const router = express.Router();
router.post('/login-user', loginUser);

module.exports = router;
