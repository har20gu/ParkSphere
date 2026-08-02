const express = require("express");
const router = express.Router();

const {
  vehicleEntry,
  previewVehicleExit,
  vehicleExit,
  getAllVehicles,
  getActiveVehicles,
  searchVehicle,
  lookupVehicleProfile
} = require("../controllers/vehicleController");

router.post("/entry", vehicleEntry);
router.post("/exit-preview", previewVehicleExit);
router.post("/exit", vehicleExit);
router.get("/all", getAllVehicles);
router.get("/active", getActiveVehicles);
router.get("/search", searchVehicle);
router.get("/lookup", lookupVehicleProfile);

module.exports = router;