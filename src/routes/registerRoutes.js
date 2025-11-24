const express = require('express');
const { registerUser } = require('../controller/registerController');
const requireRole = require("../middleware/requireRole");
const { verifyToken }= require("../middleware/authMiddleware")
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(verifyToken, requireRole(["admin"]));
router.post('/create-user', upload.single(), registerUser);

module.exports = router;
