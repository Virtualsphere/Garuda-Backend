const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const upload = require("../middleware/uploadMiddleware");
const landController= require("../controller/landController");
const sessionController= require("../controller/sessionController");
const registerController= require("../controller/registerController");
const baseController= require("../controller/baseController");
const notificationController= require("../controller/notificationController");

router.use(verifyToken);

const landUpload = upload.fields([
  { name: "passbook_photo", maxCount: 1 },
  { name: "land_border", maxCount: 1 },
  { name: "land_photo" },
  { name: "land_video" }
]);

const startginSessionUpload = upload.fields([
  { name: "starting_image", maxCount: 1 }
]);

const endingSessionUpload= upload.fields([
  { name: "end_image", maxCount: 1 },
  { name: "ticket_image" }
]);

const regionalDetailsUpdate= upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1},
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 }
]);

router.post("/land",landUpload, landController.createFullLandEntry);
router.get("/land/unverified", landController.getAllUniverfiedLandFullDetails);
router.get("/land/rejected", landController.getAllRejectedLandFullDetails);
router.get("/land/draft", landController.getAllLandFullDraftDetails);
router.put("/land/:land_id", landUpload, landController.updateVerficationLandWithPhysicalVerificationDetails);

router.post("/session", startginSessionUpload, sessionController.createSession);
router.put("/update/session/:id", endingSessionUpload, sessionController.updateSession);
router.get('/session', sessionController.getRegionalSessions);

router.get("/personal/details", registerController.getUserProfile);
router.put("/personal/details", regionalDetailsUpdate, registerController.updateUserDetails);

router.get("/travel-wallet", baseController.getTravelWallet);
router.get("/land-wallet", baseController.getLandWallet);
router.get("/land-month-wallet", baseController.getLandMonthWallet);

router.get("/physical/wallet", baseController.getPhysicalWallet);

router.post("/notification", notificationController.createNotification);

module.exports = router;