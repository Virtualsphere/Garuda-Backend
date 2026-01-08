const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const upload = require("../middleware/uploadMiddleware");
const landController= require("../controller/landController");
const sessionController= require("../controller/sessionController");
const registerController= require("../controller/registerController");
const baseController= require("../controller/baseController");

router.use(verifyToken);



module.exports = router;