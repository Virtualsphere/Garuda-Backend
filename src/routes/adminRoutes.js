const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const upload = require("../middleware/uploadMiddleware");

const {
  updateUserDetails,
  getUserProfile,
  getAllLandFullDetails,
  getLandMonthWallet,
  getTravelWallet,
  getLandWallet,
  updateLandMonthWallet,
  updateTravelWallet,
  updateLandWallet,
  updateLandDetails,
  getSessionsByUser,
  bulkUpdateLandCodes,
  getLandCodeById,
  getLandCodeStats,
  deleteLandCode,
  updateLandCode,
  getLandCodesByLocation,
  generateLandCodes,
  getLandData
} = require("../controller/adminController");

const { createBuyer, getBuyers, addWishlist, getWishList } = require("../controller/BuyerController");

const locationController = require('../controller/locationController');

const agentController= require('../controller/agentController');

router.use(verifyToken, requireRole(["admin"]));

const userDetailsUpdate= upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1},
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 }
]);

const landUpload = upload.fields([
  { name: "passbook_photo", maxCount: 1 },
  { name: "land_border", maxCount: 1 },
  { name: "land_photo" },
  { name: "land_video" }
]);

router.get("/personal/details", getUserProfile);
router.get('/land', getAllLandFullDetails);
router.put("/personal/details", userDetailsUpdate, updateUserDetails);
router.put("/land/:land_id", landUpload, updateLandDetails);

router.get("/travel/wallet", getTravelWallet);
router.get("/land/wallet", getLandWallet);
router.get("/land/wallet/month", getLandMonthWallet);

router.put("/travel/wallet/:id", updateTravelWallet);
router.put("/land/wallet/:id", updateLandWallet);
router.put("/land/month/wallet/:id", updateLandMonthWallet);

router.get("/buyers", getBuyers);
router.post("/buyers", createBuyer);
router.post("/wishlist", addWishlist);
router.get("/wishlist", getWishList);
router.get("/session/:session_id", getSessionsByUser);

router.get('/states', locationController.getStates);
router.post('/states', locationController.addState);
router.post('/states/bulk', locationController.addMultipleStates);

router.get('/states/:stateId/districts', locationController.getDistrictsByState);
router.post('/districts', locationController.addDistrict);
router.post('/districts/bulk', locationController.addMultipleDistricts);

router.get('/districts/:districtId/mandals', locationController.getMandalsByDistrict);
router.post('/mandals', locationController.addMandal);
router.post('/mandals/bulk', locationController.addMultipleMandals);

router.get('/districts/:districtId/sectors', locationController.getSectorsByDistrict);
router.post('/sectors', locationController.addSector);
router.post('/sectors/bulk', locationController.addMultipleSectors);

router.get('/districts/:districtId/towns', locationController.getTownsByDistrict);
router.post('/towns', locationController.addTown);
router.post('/towns/bulk', locationController.addMultipleTowns);

router.get('/mandals/:mandalId/villages', locationController.getVillagesByMandal);
router.get('/sectors/:sectorId/villages', locationController.getVillagesBySector);
router.post('/villages/mandal', locationController.addVillageToMandal);
router.post('/villages/sector', locationController.addVillageToSector);
router.post('/villages/mandal/bulk', locationController.addMultipleVillagesToMandal);
router.post('/villages/sector/bulk', locationController.addMultipleVillagesToSector);

router.get('/states/:stateId/details', locationController.getStateDetails);
router.get('/districts/:districtId/details', locationController.getDistrictDetails);
router.get('/search', locationController.searchLocation);

router.get('/agents', agentController.getAllAgents);
router.get('/agents/:agentId', agentController.getAgentById);
router.post('/agents', agentController.createAgent);
router.put('/agents/:agentId', agentController.updateAgent);
router.delete('/agents/:agentId', agentController.deleteAgent);
router.get('/agents/available-lands', agentController.getAvailableLands);

router.get('/agents/:agentId/lands', agentController.getAgentLands);

router.post('/land-codes/generate', generateLandCodes);
router.get('/land-codes', getLandCodesByLocation);
router.get('/land-codes/stats', getLandCodeStats);
router.get('/land-codes/:id', getLandCodeById);
router.put('/land-codes/:id', updateLandCode);
router.delete('/land-codes/:id', deleteLandCode);
router.post('/land-codes/bulk-update', bulkUpdateLandCodes);

router.get('/land/data', getLandData);

module.exports = router;
