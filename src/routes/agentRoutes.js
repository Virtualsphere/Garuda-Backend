const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const upload = require("../middleware/uploadMiddleware");

const {
  createFullLandEntry,
  createSession,
  updateSession,
  getAllLandFullDetails,
  updateLandDetails,
  updateUserDetails,
  getUserDetails,
  getAddress
} = require("../controller/agentController");

router.use(verifyToken, requireRole(["admin", "agent"]));

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
  { name: "image", maxCount: 1 }
]);

router.post("/session", startginSessionUpload, createSession);
router.put("/update/session/:id", endingSessionUpload, updateSession);

router.get("/personal/details", getUserDetails);
router.put("/personal/details", agentDetailsUpdate, updateUserDetails);
router.post("/address", getAddress);

module.exports = router;
