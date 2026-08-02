const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    uppercase: true, // auto convert to uppercase
    match: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/ // format validation
  },
  ownerName: { type: String, required: true },
  phoneNumber: {
    type: String,
    match: /^\+?[0-9]{10,15}$/
  },
  purpose: String,
  slot: String,
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  status: { type: String, enum: ["IN", "OUT"], default: "IN" },
  parkedHours: { type: Number, default: 0 },
  parkingFee: { type: Number, default: 0 },
  overdueNotifiedAt: { type: Date }
});

// Enforce uniqueness for active vehicles to prevent race conditions
vehicleSchema.index(
  { slot: 1 },
  { unique: true, partialFilterExpression: { status: "IN" } }
);

vehicleSchema.index(
  { vehicleNumber: 1 },
  { unique: true, partialFilterExpression: { status: "IN" } }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);