const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.default || connectMongo;
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
require("dotenv").config();

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
  process.env.VITE_API_URL,
  process.env.CLIENT_URL
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /https:\/\/.*\.vercel\.app$/i.test(origin);
};

app.set("trust proxy", 1);
app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// session expires in 8 hours
app.use(
  session({
    secret: process.env.SESSION_SECRET || "vehicle-session-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions"
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Removed View Engine

// Load models before connecting to MongoDB
const Vehicle = require("./models/Vehicle");
const Guard = require("./models/Guard");

app.locals.slots = ["A1", "A2", "B1", "B2", "J1", "J2", "T1", "T2", "C1", "C2"];

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

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

const getLast7DaysEntryStats = async () => {
  const stats = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - i);

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const entries = await Vehicle.countDocuments({
      entryTime: { $gte: start, $lte: end }
    });

    stats.push({
      date: formatLocalDate(start),
      entries
    });
  }

  return stats;
};

const requireGuard = (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== "guard" && req.session.user.role !== "admin")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

const makeUsername = (name) => {
  const base = String(name || "guard")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "guard";
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base}${suffix}`;
};

const makePassword = () => {
  return Math.random().toString(36).slice(-10);
};

// Routes
const vehicleRoutes = require("./routes/vehicleRoutes");
app.use("/api/vehicle", requireGuard, vehicleRoutes);

app.get("/api/auth/me", (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.json({ user: null });
});

app.post("/login", async (req, res) => {
  try {
    const { role, username, password } = req.body;

    if (role === "admin") {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

      if (username === adminUsername && password === adminPassword) {
        req.session.user = { role: "admin", username: adminUsername, name: "Administrator" };
        return res.json({ user: req.session.user });
      }

      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const guard = await Guard.findOne({ username: String(username || "").toLowerCase(), isActive: true });
    if (!guard) {
      return res.status(401).json({ error: "Guard account not found or inactive." });
    }

    const isValidPassword = await bcrypt.compare(password, guard.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid guard credentials." });
    }

    req.session.user = { role: "guard", username: guard.username, name: guard.name, id: guard._id.toString() };
    return res.json({ user: req.session.user });
  } catch (err) {
    return res.status(500).json({ error: "Login failed. Try again." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Dashboard Route
app.get("/api/dashboard", requireGuard, async (req, res) => {
  try {
    const { selectedDate, start, end } = getDateRange(req.query.date);
    const vehicles = await Vehicle.find({ entryTime: { $gte: start, $lte: end } }).sort({ entryTime: -1 });
    const activeVehicles = await Vehicle.find({ status: "IN" }).select("vehicleNumber slot");
    const activeCarsCount = activeVehicles.length;
    const isSurge = activeCarsCount > 10;
    res.json({ vehicles, selectedDate, user: req.session.user, isSurge, activeVehicles, slots: req.app.locals.slots });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

app.get("/dashboard/receipt/:id", requireGuard, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.status !== "OUT") {
      return res.status(404).send("Receipt available only for exited vehicles.");
    }

    const receiptNo = `RCPT-${String(vehicle._id).slice(-6).toUpperCase()}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${vehicle.vehicleNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("ParkSphere Parking Receipt", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Receipt No: ${receiptNo}`);
    doc.text(`Date: ${new Date(vehicle.exitTime).toLocaleDateString()}`);
    doc.moveDown(0.8);

    doc.fontSize(12).text(`Vehicle Number: ${vehicle.vehicleNumber}`);
    doc.text(`Owner Name: ${vehicle.ownerName || "-"}`);
    doc.text(`Phone Number: ${vehicle.phoneNumber || "-"}`);
    doc.text(`Purpose: ${vehicle.purpose || "-"}`);
    doc.text(`Entry Time: ${new Date(vehicle.entryTime).toLocaleString()}`);
    doc.text(`Exit Time: ${new Date(vehicle.exitTime).toLocaleString()}`);
    doc.text(`Parked Duration: ${vehicle.parkedHours || 0} hour(s)`);
    doc.moveDown(0.8);
    doc.fontSize(14).text(`Total Amount: Rs ${vehicle.parkingFee || 0}`, { underline: true });
    doc.moveDown(1.5);
    doc.fontSize(10).text("Thank you. Please keep this receipt for records.");

    doc.end();
  } catch (err) {
    return res.status(500).send("Unable to generate receipt.");
  }
});

app.get("/api/bill/:id", requireGuard, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.status !== "OUT") {
      return res.status(404).json({ error: "Bill available only for exited vehicles." });
    }

    const upiId = String(process.env.UPI_ID || "").trim();
    const amount = Number(vehicle.parkingFee || 0).toFixed(2);
    const upiPaymentLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("ParkSphere")}&tn=${encodeURIComponent(`Parking Fee ${vehicle.vehicleNumber}`)}&am=${encodeURIComponent(amount)}&cu=INR`
      : "";
    const qrCodeDataUrl = upiPaymentLink
      ? await QRCode.toDataURL(upiPaymentLink, {
        width: 240,
        margin: 1
      })
      : "";

    return res.json({
      vehicle,
      upiId,
      qrCodeDataUrl,
      upiPaymentLink
    });
  } catch (err) {
    return res.status(500).json({ error: "Unable to load bill page." });
  }
});

app.get("/api/admin", requireAdmin, async (req, res) => {
  try {
    const { selectedDate, start, end } = getDateRange(req.query.date);
    const guards = await Guard.find().sort({ createdAt: -1 });
    const dailyVehicles = await Vehicle.find({ entryTime: { $gte: start, $lte: end } });
    const last7DaysEntries = await getLast7DaysEntryStats();
    const exitedCount = dailyVehicles.filter((item) => item.status === "OUT").length;
    const dailyRevenue = dailyVehicles.reduce((sum, item) => sum + (item.parkingFee || 0), 0);

    res.json({
      guards,
      selectedDate,
      metrics: {
        totalEntries: dailyVehicles.length,
        exitedCount,
        activeCount: dailyVehicles.length - exitedCount,
        dailyRevenue
      },
      last7DaysEntries
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to load admin data" });
  }
});

app.post("/api/admin/guards", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    let username = String(req.body.username || "").trim().toLowerCase();
    let password = String(req.body.password || "").trim();

    if (!name) {
      return res.status(400).json({ error: "Guard name is required." });
    }

    if (!username) {
      username = makeUsername(name);
    }
    if (!password) {
      password = makePassword();
    }

    const exists = await Guard.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already exists. Try another one." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await Guard.create({ name, username, passwordHash });

    return res.json({ createdGuard: { name, username, password } });
  } catch (err) {
    return res.status(500).json({ error: "Unable to create guard." });
  }
});

app.post("/api/admin/guards/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const guard = await Guard.findById(req.params.id);
    if (!guard) {
      return res.status(404).json({ error: "Guard not found." });
    }

    const password = makePassword();
    guard.passwordHash = await bcrypt.hash(password, 10);
    await guard.save();

    return res.json({
      createdGuard: {
        name: guard.name,
        username: guard.username,
        password,
        isReset: true
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Unable to reset password." });
  }
});


app.get("/admin/reports/csv", requireAdmin, async (req, res) => {
  try {
    const { selectedDate, start, end } = getDateRange(req.query.date);
    const vehicles = await Vehicle.find({ entryTime: { $gte: start, $lte: end } }).sort({ entryTime: -1 });

    const header = [
      "Vehicle Number",
      "Owner Name",
      "Phone Number",
      "Purpose",
      "Status",
      "Entry Time",
      "Exit Time",
      "Parked Hours",
      "Parking Fee"
    ];

    const rows = vehicles.map((v) => [
      v.vehicleNumber,
      v.ownerName || "",
      v.phoneNumber || "",
      v.purpose || "",
      v.status,
      new Date(v.entryTime).toLocaleString(),
      v.exitTime ? new Date(v.exitTime).toLocaleString() : "",
      v.parkedHours || 0,
      v.parkingFee || 0
    ]);

    const toCsvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((line) => line.map(toCsvCell).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="daily-report-${selectedDate}.csv"`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).send("Unable to generate CSV report.");
  }
});

app.get("/admin/reports/pdf", requireAdmin, async (req, res) => {
  try {
    const { selectedDate, start, end } = getDateRange(req.query.date);
    const vehicles = await Vehicle.find({ entryTime: { $gte: start, $lte: end } }).sort({ entryTime: -1 });
    const exitedCount = vehicles.filter((v) => v.status === "OUT").length;
    const revenue = vehicles.reduce((sum, v) => sum + (v.parkingFee || 0), 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="daily-report-${selectedDate}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("ParkSphere Daily Report", { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(11).text(`Date: ${selectedDate}`);
    doc.text(`Total Entries: ${vehicles.length}`);
    doc.text(`Exited Vehicles: ${exitedCount}`);
    doc.text(`Active Inside: ${vehicles.length - exitedCount}`);
    doc.text(`Daily Revenue (Rs): ${revenue}`);
    doc.moveDown(0.8);

    doc.fontSize(11).text("Records:", { underline: true });
    doc.moveDown(0.4);

    vehicles.forEach((v, index) => {
      const line = `${index + 1}. ${v.vehicleNumber} | ${v.ownerName || "-"} | ${v.phoneNumber || "-"} | ${v.status} | Entry: ${new Date(v.entryTime).toLocaleString()} | Exit: ${v.exitTime ? new Date(v.exitTime).toLocaleString() : "-"} | Hrs: ${v.parkedHours || 0} | Fee: Rs ${v.parkingFee || 0}`;
      doc.fontSize(9).text(line);
      if (doc.y > 760) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (err) {
    return res.status(500).send("Unable to generate PDF report.");
  }
});

// Root check
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  return res.redirect(req.session.user.role === "admin" ? "/admin" : "/dashboard");
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

module.exports = app;