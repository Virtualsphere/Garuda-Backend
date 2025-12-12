const express = require("express");
const router = express.Router();
const locationController= require("../controller/locationController");
const roleController= require("../controller/roleController");

router.get('/states', locationController.getStates);
router.get('/states/:stateId/districts', locationController.getDistrictsByState);
router.get('/districts/:districtId/mandals', locationController.getMandalsByDistrict);
router.get('/districts/:districtId/sectors', locationController.getSectorsByDistrict);
router.get('/districts/:districtId/towns', locationController.getTownsByDistrict);
router.get('/mandals/:mandalId/villages', locationController.getVillagesByMandal);
router.get('/sectors/:sectorId/villages', locationController.getVillagesBySector);
router.get('/states/:stateId/details', locationController.getStateDetails);
router.get('/districts/:districtId/details', locationController.getDistrictDetails);
router.get('/search', locationController.searchLocation);

module.exports = router;