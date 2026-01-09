const express = require('express');
const landController= require("../controller/landController");
const registerController= require("../controller/registerController");
const upload = require("../middleware/uploadMiddleware");
const verifyToken = require("../middleware/authMiddleware");
const landPurchaseRequestController= require("../controller/landPurchaseController");

const router = express.Router();

const userDetailsUpdate= upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1},
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 }
]);

router.post('/create-user', upload.single(), registerController.registerUser);
router.get('/verified/land', landController.getAllVerfiedLandFullDetails);
router.get('/verified/land/purchase', verifyToken, landController.getAllVerfiedLandFullDetails);
router.get('/details', verifyToken, registerController.getUserProfile);
router.put('/details', verifyToken, userDetailsUpdate, registerController.updateUserDetails);
router.get('/verified/land/:id', landController.getVerifiedLandDetailsById);
router.post('/land-purchase', verifyToken, landPurchaseRequestController.createLandPurchase);
router.get('/land-purchase', verifyToken, landPurchaseRequestController.getLandPurchaseDetail);

module.exports = router;