const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const registerController= require("../controller/registerController");
const marketingController = require("../controller/marketingController");
const sessionController= require("../controller/sessionController");
const walletController= require("../controller/baseController");
const notificationController= require("../controller/notificationController");

router.use(verifyToken);

const marketingDetailsUpdate= upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1},
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 }
]);

const startginSessionUpload = upload.fields([
  { name: "starting_image", maxCount: 1 }
]);

const endingSessionUpload= upload.fields([
  { name: "end_image", maxCount: 1 },
  { name: "ticket_image" }
]);

router.get("/personal/details", registerController.getUserProfile);
router.put("/personal/details", marketingDetailsUpdate, registerController.updateUserDetails);

router.post("/session", startginSessionUpload, sessionController.createSession);
router.put("/update/session/:id", endingSessionUpload, sessionController.updateSession);
router.get('/session', sessionController.getMarketingSessions);

router.post(
  "/poster-sticking",
  upload.any(),
  marketingController.createPosterSticking
);

router.post(
  "/job-posting",
  upload.any(),
  marketingController.createJobPosting
);

router.post(
  "/tv-advertising",
  upload.any(),
  marketingController.createTVAdvertising
);

router.post(
  "/banner-advertising",
  upload.any(),
  marketingController.createBannerAdvertising
);

router.post(
  "/hoarding",
  upload.fields([
    { name: "hoarding_photo", maxCount: 1 }
  ]),
  marketingController.createHoardingDetails
);

router.post(
  "/our-ads",
  upload.fields([
    { name: "ad_photo", maxCount: 1 },
    { name: "location_photo", maxCount: 1 }
  ]),
  marketingController.createOurAds
);

router.post("/notification", notificationController.createNotification);

router.get('/poster-sticking', verifyToken, marketingController.getPosterSticking);
router.get('/job-posting', verifyToken, marketingController.getJobPosting);
router.get('/tv-advertising', verifyToken, marketingController.getTVAdvertising);
router.get('/banner-advertising', verifyToken, marketingController.getBannerAdvertising);
router.get('/hoarding', verifyToken, marketingController.getHoardingDetails);
router.get('/our-ads', verifyToken, marketingController.getOurAds);
router.get('/poster-wallet', verifyToken, walletController.getPosterWallet);
router.get('/job-wallet', verifyToken, walletController.getJobPostWallet);
router.get('/ads-wallet', verifyToken, walletController.getAdsWallet);

module.exports = router;