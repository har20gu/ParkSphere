const Vehicle = require("../models/Vehicle");
const MS_PER_HOUR = 1000 * 60 * 60;
const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (dateString) => {
  const selectedDate = dateString || formatLocalDate();
  const start = new Date(`${selectedDate}T00:00:00`);
  const end = new Date(`${selectedDate}T23:59:59.999`);
  return { selectedDate, start, end };
};

const calculateParkingBill = (entryTime, exitTime = new Date(), isSurge = false) => {
  const parkedMs = Math.max(0, exitTime.getTime() - entryTime.getTime());
  const exactHours = parkedMs / MS_PER_HOUR;
  
  // Total hours parked rounded up for display (minimum 1)
  const parkedHours = Math.max(1, Math.ceil(exactHours));
  
  let parkingFee = 0;
  if (exactHours <= 0.5) {
    parkingFee = 50;
  } else {
    const extraHours = Math.ceil(exactHours - 0.5);
    parkingFee = 50 + (extraHours * 100);
  }
  
  if (isSurge) {
    parkingFee = Math.ceil(parkingFee * 1.25); // 25% increase
  }
  
  return { parkedHours, parkingFee, exitTime, isSurge };
};

const normalizePhoneNumber = (value) => {
  const input = String(value || "").trim();
  const hasPlusPrefix = input.startsWith("+");
  const digitsOnly = input.replace(/\D/g, "");
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
};

// ENTRY
exports.vehicleEntry = async (req, res) => {
  try {
    let { vehicleNumber, ownerName, phoneNumber, purpose, slot } = req.body;

    vehicleNumber = vehicleNumber.toUpperCase(); // normalize
    ownerName = String(ownerName || "").trim();
    phoneNumber = normalizePhoneNumber(phoneNumber);
    purpose = String(purpose || "").trim();
    slot = String(slot || "").trim();

    const latestKnownVehicle = await Vehicle.findOne({ vehicleNumber })
      .sort({ entryTime: -1 })
      .select("ownerName phoneNumber");

    if (!ownerName && latestKnownVehicle?.ownerName) {
      ownerName = latestKnownVehicle.ownerName;
    }
    if (!phoneNumber && latestKnownVehicle?.phoneNumber) {
      phoneNumber = latestKnownVehicle.phoneNumber;
    }

    if (!ownerName) {
      return res.status(400).send("Owner name is required.");
    }
    if (!phoneNumber) {
      return res.status(400).send("Phone number is required for new vehicle.");
    }
    if (!/^\+?[0-9]{10,15}$/.test(phoneNumber)) {
      return res.status(400).send("Enter a valid phone number (10-15 digits, optional +country code).");
    }
    if (!purpose) {
      return res.status(400).send("Purpose is required.");
    }
    if (!slot) {
      return res.status(400).send("Parking slot is required.");
    }

    const isOccupied = await Vehicle.findOne({ slot, status: "IN" });
    if (isOccupied) {
      return res.status(400).send("Selected parking slot is currently occupied.");
    }

    const vehicle = new Vehicle({
      vehicleNumber,
      ownerName,
      phoneNumber,
      purpose,
      slot
    });

    await vehicle.save();
    return res.json({ success: true, vehicle });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.slot) {
        return res.status(400).send("Race condition prevented: Selected parking slot was just occupied by another entry.");
      }
      if (err.keyPattern && err.keyPattern.vehicleNumber) {
        return res.status(400).send("Race condition prevented: This vehicle is already marked as IN.");
      }
    }
    res.status(500).json({ error: err.message });
  }
};

exports.lookupVehicleProfile = async (req, res) => {
  try {
    const number = String(req.query.number || "").trim().toUpperCase();
    if (!number) {
      return res.status(400).json({ message: "Vehicle number is required." });
    }

    const latestKnownVehicle = await Vehicle.findOne({ vehicleNumber: number })
      .sort({ entryTime: -1 })
      .select("ownerName phoneNumber vehicleNumber");

    if (!latestKnownVehicle) {
      return res.json({ found: false });
    }

    return res.json({
      found: true,
      vehicleNumber: latestKnownVehicle.vehicleNumber,
      ownerName: latestKnownVehicle.ownerName || "",
      phoneNumber: latestKnownVehicle.phoneNumber || ""
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



// EXIT
exports.previewVehicleExit = async (req, res) => {
  try {
    let { vehicleNumber } = req.body;
    vehicleNumber = vehicleNumber.toUpperCase();

    const vehicle = await Vehicle.findOne({ vehicleNumber, status: "IN" });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or already exited" });
    }

    const activeCarsCount = await Vehicle.countDocuments({ status: "IN" });
    const isSurge = activeCarsCount > 10;

    const bill = calculateParkingBill(vehicle.entryTime, new Date(), isSurge);
    return res.json({
      vehicleNumber: vehicle.vehicleNumber,
      ownerName: vehicle.ownerName,
      phoneNumber: vehicle.phoneNumber,
      parkedHours: bill.parkedHours,
      parkingFee: bill.parkingFee,
      isSurge: bill.isSurge
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.vehicleExit = async (req, res) => {
  try {
    let { vehicleNumber } = req.body;

    vehicleNumber = vehicleNumber.toUpperCase(); // normalize

    const vehicle = await Vehicle.findOne({ vehicleNumber, status: "IN" });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or already exited" });
    }

    const activeCarsCount = await Vehicle.countDocuments({ status: "IN" });
    const isSurge = activeCarsCount > 10;

    const bill = calculateParkingBill(vehicle.entryTime, new Date(), isSurge);
    vehicle.exitTime = bill.exitTime;
    vehicle.status = "OUT";
    vehicle.parkedHours = bill.parkedHours;
    vehicle.parkingFee = bill.parkingFee;

    await vehicle.save();
    return res.json({ success: true, billId: vehicle._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET ALL
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ entryTime: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET CURRENT INSIDE
exports.getActiveVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ status: "IN" });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// SEARCH VEHICLE
exports.searchVehicle = async (req, res) => {
  try {
    let { number, date } = req.query;

    // normalize (ignore case)
    number = String(number || "").toUpperCase();
    const { selectedDate, start, end } = getDateRange(date);

    const vehicles = await Vehicle.find({
      entryTime: { $gte: start, $lte: end },
      vehicleNumber: { $regex: number, $options: "i" }
    }).sort({ entryTime: -1 });

    const activeVehicles = await Vehicle.find({ status: "IN" }).select("vehicleNumber slot");
    const isSurge = activeVehicles.length > 10;

    res.json({ vehicles, selectedDate, user: req.session?.user, activeVehicles, isSurge, slots: req.app.locals.slots });
  } catch (err) {
    res.status(500).json({ error: "Error searching vehicle" });
  }
};