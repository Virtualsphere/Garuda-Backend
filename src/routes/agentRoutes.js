const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const locationController= require("../controller/locationController");

const upload = require("../middleware/uploadMiddleware");

const {
  createFullLandEntry,
  createSession,
  updateSession,
  getAllLandFullDetails,
  updateLandDetails,
  updateUserDetails,
  getUserProfile,
  getAddress,
  getSessionsByUser,
  getAllLandFullDraftDetails
} = require("../controller/agentController");

const { getLandWallet, getTravelWallet, getLandMonthWallet }= require("../controller/baseController");

router.use(verifyToken, requireRole(["admin", "field executive"]));

// -----------------------------
// LAND UPLOAD MIDDLEWARE
// -----------------------------
const landUpload = upload.fields([
  { name: "passbook_photo", maxCount: 1 },
  { name: "land_border", maxCount: 1 },
  { name: "land_photo" },
  { name: "land_video" }
]);

router.post("/land", landUpload, createFullLandEntry);
router.get("/land", getAllLandFullDetails);
router.get("/land/draft", getAllLandFullDraftDetails);
router.put("/land/:land_id", landUpload, updateLandDetails);

// -----------------------------
// SESSION UPLOAD MIDDLEWARE
// -----------------------------
const startginSessionUpload = upload.fields([
  { name: "starting_image", maxCount: 1 }
]);

const endingSessionUpload= upload.fields([
  { name: "end_image", maxCount: 1 },
  { name: "ticket_image" }
]);

const agentDetailsUpdate= upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1},
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 }
]);

router.post("/session", startginSessionUpload, createSession);
router.put("/update/session/:id", endingSessionUpload, updateSession);
router.get('/session', getSessionsByUser);

router.get("/personal/details", getUserProfile);
router.put("/personal/details", agentDetailsUpdate, updateUserDetails);
router.post("/address", getAddress);

router.get("/travel-wallet", getTravelWallet);
router.get("/land-wallet", getLandWallet);
router.get("/land-month-wallet", getLandMonthWallet);

module.exports = router;
