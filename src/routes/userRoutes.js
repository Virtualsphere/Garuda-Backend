const express = require('express');
const landController= require("../controller/landController");
const registerController= require("../controller/registerController");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post('/create-user', upload.single(), registerController.registerUser);
router.get('/verified/land', landController.getAllVerfiedLandFullDetails);
router.get('/details', registerController.getUserProfile);
router.put('/details', registerController.updateUserDetails);
router.get('/verified/land/:id', landController.getVerifiedLandDetailsById);

module.exports = router;