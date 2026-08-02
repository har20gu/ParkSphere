console.log("Starting debug...");

try {
  console.log("Loading express...");
  const express = require("express");
  console.log("Express loaded");

  console.log("Loading mongoose...");
  const mongoose = require("mongoose");
  console.log("Mongoose loaded");

  console.log("Loading dotenv...");
  require("dotenv").config();
  console.log("Dotenv loaded");

  console.log("Loading Vehicle model...");
  const Vehicle = require("./models/Vehicle");
  console.log("Vehicle model loaded");

  console.log("Loading Guard model...");
  const Guard = require("./models/Guard");
  console.log("Guard model loaded");

  console.log("Loading PricingConfig model...");
  const PricingConfig = require("./models/PricingConfig");
  console.log("PricingConfig model loaded");

  console.log("Loading dynamic pricing service...");
  const dynamicPricingService = require("./services/dynamicPricingService");
  console.log("Dynamic pricing service loaded");

  console.log("All modules loaded successfully!");

} catch (error) {
  console.error("Error occurred:", error.message);
  console.error("Stack trace:", error.stack);
}

process.exit(0);
