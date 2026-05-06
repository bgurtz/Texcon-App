// @ts-nocheck
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Settings = require("../models/Settings");

const router = express.Router();

/* =========================
   Admin guard
========================= */
function requireAdmin(req, res) {
  if (!req.session || !req.session.userId || req.session.role !== "admin") {
    res.redirect("/login");
    return false;
  }
  return true;
}

/* =========================
   Admin Dashboard
========================= */
router.get("/", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.render("admin/dashboard");
});

/* =========================
   Drivers: List
========================= */
router.get("/drivers", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const drivers = await User.find({ role: "driver" }).sort({
    lastName: 1,
    firstName: 1
  });

  res.render("admin/drivers", { drivers });
});

/* =========================
   Drivers: Create
========================= */
router.post("/drivers/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const passwordHash = await bcrypt.hash(req.body.password, 12);

  const hourlyRate = Number(req.body.hourlyRate || 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payRates = [];
  if (hourlyRate > 0) {
    payRates.push({ rate: hourlyRate, effectiveDate: today });
  }

  await User.create({
    role: "driver",
    username: req.body.username,
    passwordHash,
    firstName: req.body.firstName || "",
    lastName: req.body.lastName || "",
    phone: req.body.phone || "",
    truckNumber: req.body.truckNumber || "",
    trailerNumber: req.body.trailerNumber || "",
    truckType: req.body.truckType || "",
    hourlyRate,
    payRates,
    active: true
  });

  res.redirect("/admin/drivers");
});

/* =========================
   Drivers: Edit page
========================= */
router.get("/drivers/:id/edit", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const driver = await User.findById(req.params.id);
  if (!driver) return res.redirect("/admin/drivers");

  driver.payRates = driver.payRates || [];
  driver.payRates.sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

  res.render("admin/edit-driver", { driver });
});

/* =========================
   Drivers: Update + scheduled raise
   (Uses findByIdAndUpdate so passwordHash is never revalidated)
========================= */
router.post("/drivers/:id/update", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const update = {
    firstName: req.body.firstName || "",
    lastName: req.body.lastName || "",
    truckType: req.body.truckType || "",
    truckNumber: req.body.truckNumber || "",
    active: req.body.active === "on"
  };

  if (req.body.hourlyRate !== undefined && req.body.hourlyRate !== "") {
    update.hourlyRate = Number(req.body.hourlyRate || 0);
  }

  const newRate = req.body.newRate;
  const effectiveDate = req.body.effectiveDate;

  if (newRate && effectiveDate) {
    const rate = Number(newRate);
    const date = new Date(effectiveDate);
    date.setHours(0, 0, 0, 0);

    await User.findByIdAndUpdate(
      req.params.id,
      { $set: update, $push: { payRates: { rate, effectiveDate: date } } },
      { runValidators: false }
    );
  } else {
    await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { runValidators: false }
    );
  }

  res.redirect("/admin/drivers");
});

/* =========================
   GeoFence Settings
========================= */
router.get("/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      geofenceEnabled: false,
      centerLat: 30.796835,
      centerLng: -96.500397,
      radiusYards: 125
    });
  }

  res.render("admin/settings", { settings });
});

router.post("/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});

  settings.geofenceEnabled = req.body.geofenceEnabled === "on";

  if (req.body.centerLat) settings.centerLat = Number(req.body.centerLat);
  if (req.body.centerLng) settings.centerLng = Number(req.body.centerLng);
  if (req.body.radiusYards) settings.radiusYards = Number(req.body.radiusYards);

  await settings.save();

  res.redirect("/admin/settings");
});

module.exports = router;
