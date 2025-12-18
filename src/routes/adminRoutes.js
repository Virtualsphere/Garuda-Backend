const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const upload = require("../middleware/uploadMiddleware");

const baseController= require("../controller/baseController");

const buyerController = require("../controller/BuyerController");

const locationController = require('../controller/locationController');

const agentController= require('../controller/agentController');

const landController= require("../controller/landController");

const registerController= require("../controller/registerController");

const sessionController= require("../controller/sessionController");

const landCodeController= require("../controller/landCodeController");

const roleController= require("../controller/roleController");

router.use(verifyToken);

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

router.get("/personal/details", registerController.getAllUserProfile);
router.get('/land', landController.getAllFullLandFullDetails);
router.put("/personal/details", userDetailsUpdate, registerController.updateByAdminUserDetails);
router.put("/land/:land_id", landUpload, landController.updateVerficationLandWithPhysicalVerificationDetails);
router.get("/personal/detail", registerController.getUserProfile);

router.get("/travel/wallet", baseController.getAllTravelWallet);
router.get("/land/wallet", baseController.getAllLandWallet);
router.get("/land/wallet/month", baseController.getAllLandMonthWallet);
router.get("/physical/wallet", baseController.getAllPhysicalWallet);

router.put("/travel/wallet/:id", baseController.updateTravelWallet);
router.put("/land/wallet/:id", baseController.updateLandWallet);
router.put("/land/month/wallet/:id", baseController.updateLandMonthWallet);
router.put("/physical/wallet/:id", baseController.updatePhysicalVerificationWallet);

router.get("/buyers", buyerController.getBuyers);
router.post("/buyers", buyerController.createBuyer);
router.post("/wishlist", buyerController.addWishlist);
router.get("/wishlist", buyerController.getWishList);
router.get("/session/:session_id", sessionController.getSessionsByUserId);

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

router.post('/land-codes/generate', landCodeController.generateLandCodes);
router.get('/land-codes', landCodeController.getLandCodesByLocation);
router.get('/land-codes/stats', landCodeController.getLandCodeStats);
router.get('/land-codes/:id', landCodeController.getLandCodeById);
router.put('/land-codes/:id', landCodeController.updateLandCode);
router.delete('/land-codes/:id', landCodeController.deleteLandCode);
router.post('/land-codes/bulk-update', landCodeController.bulkUpdateLandCodes);

router.get('/land/data', landController.getLandData);

router.get('/roles', roleController.getAllRoles);
router.get('/roles/:roleName', roleController.getRole);
router.post('/roles', roleController.createRole);
router.put('/roles/:roleName/permissions', roleController.updateRolePermissions);
router.delete('/roles/:roleName', roleController.deleteRole);

module.exports = router;