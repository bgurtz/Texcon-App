
// @ts-nocheck
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Timesheet = require("../models/Timesheet");
const Settings = require("../models/Settings");

const router = express.Router();

/* =========================
   Admin Guard
========================= */
function requireAdmin(req, res) {
  if (!req.session || req.session.role !== "admin") {
    return res.redirect("/login");
  }
  return true;
}

/* =========================
   ADMIN DASHBOARD
========================= */
router.get("/", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.render("admin/dashboard");
});

/* =========================
   DRIVER LIST
========================= */
router.get("/drivers", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const drivers = await User.find({ role: "driver" })
    .sort({ lastName: 1 })
    .lean();

  res.render("admin/drivers", { drivers });
});

/* =========================
   CREATE DRIVER
========================= */
router.post("/drivers/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const passwordHash = await bcrypt.hash(req.body.password, 12);

  await User.create({
    role: "driver",
    username: req.body.username,
    passwordHash,
    firstName: req.body.firstName || "",
    lastName: req.body.lastName || "",
    truckType: req.body.truckType || "",
    truckNumber: req.body.truckNumber || "",
    trailerNumber: req.body.trailerNumber || "",
    yard: req.body.yard || "",
    hourlyRate: Number(req.body.hourlyRate || 0),
    status: "active",
    active: true
  });

  res.redirect("/admin/drivers");
});

/* =========================
   EDIT DRIVER
========================= */
router.get("/drivers/:id/edit", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const driver = await User.findById(req.params.id);
  res.render("admin/edit-driver", { driver });
});

/* =========================
   UPDATE DRIVER
========================= */
router.post("/drivers/:id/update", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const status = req.body.status || "active";

  const updates = {
    firstName: req.body.firstName || "",
    lastName: req.body.lastName || "",
    truckType: req.body.truckType || "",
    truckNumber: req.body.truckNumber || "",
    trailerNumber: req.body.trailerNumber || "",
    yard: req.body.yard || "",
    driverNote: req.body.driverNote || "",
    status,
    active: status === "active",
    eligibleForRehire: req.body.eligibleForRehire === "on"
  };

  if (req.body.hourlyRate !== undefined) {
    updates.hourlyRate = Number(req.body.hourlyRate || 0);
  }

  await User.findByIdAndUpdate(req.params.id, { $set: updates });

  // Optional password reset
  if (req.body.newPassword) {
    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await User.findByIdAndUpdate(req.params.id, {
      $set: { passwordHash: hash }
    });
  }

  res.redirect("/admin/drivers");
});

/* =========================
   ADMIN WEEKLY TIMESHEET (SUN–SAT)
   - Auto lunch deduction (30 min > 6.5 hrs)
   - Overtime after 40 hrs
========================= */
router.get("/timesheet/week", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const today = new Date();

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // ✅ Better approach: only ACTIVE drivers
  const drivers = await User.find({
    role: "driver",
    status: "active"
  })
    .sort({ lastName: 1 })
    .lean();

  const timesheets = await Timesheet.find({
    workDate: { $gte: weekStart, $lte: weekEnd }
  }).lean();

  // Group timesheets by driver + date
  const byDriver = {};
  for (const t of timesheets) {
    const dId = t.driverId.toString();
    const dayKey = new Date(t.workDate).toDateString();

    if (!byDriver[dId]) byDriver[dId] = {};
    byDriver[dId][dayKey] = t;
  }

  const rows = [];

  for (const driver of drivers) {
    let weekHours = 0;
    const daily = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const key = day.toDateString();

      const sheet = byDriver[driver._id]?.[key];
      let paidHours = 0;

      if (sheet && sheet.clockIn && sheet.clockOut) {
        const raw =
          (sheet.clockOut - sheet.clockIn) / (1000 * 60 * 60);

        // Auto lunch deduction
        paidHours = raw > 6.5 ? raw - 0.5 : raw;
      }

      weekHours += paidHours;
      daily.push(paidHours);
    }

    const regular = Math.min(weekHours, 40);
    const overtime = Math.max(weekHours - 40, 0);

    rows.push({
      driver,
      daily,
      regular,
      overtime,
      total: weekHours
    });
  }

  res.render("admin/weekly-timesheet", {
    rows,
    weekStart,
    weekEnd
  });
});

/* =========================
   ADMIN WEEKLY TIMESHEET EXPORT (CSV)
========================= */
router.get("/timesheet/week.csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const today = new Date();

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const drivers = await User.find({
    role: "driver",
    status: "active"
  })
    .sort({ lastName: 1 })
    .lean();

  const timesheets = await Timesheet.find({
    workDate: { $gte: weekStart, $lte: weekEnd }
  }).lean();

  const byDriver = {};
  for (const t of timesheets) {
    const id = t.driverId.toString();
    const key = new Date(t.workDate).toDateString();
    if (!byDriver[id]) byDriver[id] = {};
    byDriver[id][key] = t;
  }

  let csv =
    "Truck,Name,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Regular,Overtime,Total\n";

  for (const driver of drivers) {
    let total = 0;
    const daily = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);

      const sheet = byDriver[driver._id]?.[d.toDateString()];
      let hours = 0;

      if (sheet && sheet.clockIn && sheet.clockOut) {
        const raw =
          (sheet.clockOut - sheet.clockIn) / (1000 * 60 * 60);
        hours = raw > 6.5 ? raw - 0.5 : raw;
      }

      total += hours;
      daily.push(hours.toFixed(2));
    }

    const reg = Math.min(total, 40);
    const ot = Math.max(total - 40, 0);

    csv += [
      driver.truckNumber || "",
      `"${driver.firstName} ${driver.lastName}"`,
      ...daily,
      reg.toFixed(2),
      ot.toFixed(2),
      total.toFixed(2)
    ].join(",") + "\n";
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="weekly_timesheet_${weekStart
      .toLocaleDateString()
      .replace(/\//g, "-")}.csv"`
  );

  res.send(csv);
});

/* =========================
   SETTINGS
========================= */
router.get("/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const settings = await Settings.findOne();
  res.render("admin/settings", { settings });
});

router.post("/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  await Settings.updateOne({}, {
    geofenceEnabled: req.body.geofenceEnabled === "on"
  });

  res.redirect("/admin/settings");
});

module.exports = router;