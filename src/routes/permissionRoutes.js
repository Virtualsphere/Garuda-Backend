const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const roleController = require("../controller/roleController");

router.get('/my-permissions', verifyToken, roleController.getUserPermissions);

router.get('/my-role', verifyToken, roleController.getMyRole);

router.get('/', roleController.getAllRoles);

module.exports = router;