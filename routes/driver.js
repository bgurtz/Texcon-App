
// @ts-nocheck
const express = require("express");
const User = require("../models/User");
const Timesheet = require("../models/Timesheet");

const router = express.Router();

/* =========================
   Helpers
========================= */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// 7-minute (quarter-hour) rounding
function roundToQuarterHour(date) {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const remainder = minutes % 15;

  if (remainder <= 7) {
    d.setMinutes(minutes - remainder);
  } else {
    d.setMinutes(minutes + (15 - remainder));
  }

  d.setSeconds(0, 0);
  return d;
}

/* =========================
   DRIVER DASHBOARD
========================= */
router.get("/", async (req, res) => {
  if (!req.session || req.session.role !== "driver") {
    return res.redirect("/login");
  }

  const driver = await User.findById(req.session.userId).lean();
  const hourlyRate = driver.hourlyRate || 0;

  const todayDate = startOfToday();
  const now = new Date();

  const todaySheet = await Timesheet.findOne({
    driverId: req.session.userId,
    workDate: todayDate
  }).lean();

  let hoursToday = 0;
  if (todaySheet && todaySheet.clockIn) {
    const roundedIn = roundToQuarterHour(todaySheet.clockIn);
    const roundedOut = roundToQuarterHour(todaySheet.clockOut || now);

    hoursToday = (roundedOut - roundedIn) / (1000 * 60 * 60);
    if (hoursToday > 6.5) hoursToday -= 0.5;
    if (hoursToday < 0) hoursToday = 0;
  }

  const weekStart = new Date(todayDate);
  weekStart.setDate(todayDate.getDate() - todayDate.getDay());

  const weekSheets = await Timesheet.find({
    driverId: req.session.userId,
    workDate: { $gte: weekStart, $lte: todayDate }
  }).lean();

  let hoursWeek = 0;
  for (const s of weekSheets) {
    if (s.clockIn && s.clockOut) {
      const roundedIn = roundToQuarterHour(s.clockIn);
      const roundedOut = roundToQuarterHour(s.clockOut);

      let daily =
        (roundedOut - roundedIn) / (1000 * 60 * 60);

      if (daily > 6.5) daily -= 0.5;
      if (daily > 0) hoursWeek += daily;
    }
  }

  const regularHours = Math.min(hoursWeek, 40);
  const overtimeHours = Math.max(hoursWeek - 40, 0);

  res.render("driver/dashboard", {
    driver,
    today: todaySheet || null,
    hoursToday,
    hoursWeek,
    regularHours,
    overtimeHours,
    payToday: hoursToday * hourlyRate,
    payWeek:
      regularHours * hourlyRate +
      overtimeHours * hourlyRate * 1.5,
    payYTD: 0,
    hourlyRate
  });
});

/* =========================
   WEEKLY TIMESHEET
========================= */
router.get("/timesheet/week", async (req, res) => {
  if (!req.session || req.session.role !== "driver") {
    return res.redirect("/login");
  }

  const driver = await User.findById(req.session.userId).lean();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sheets = await Timesheet.find({
    driverId: req.session.userId,
    workDate: { $gte: weekStart, $lte: weekEnd }
  }).lean();

  const byDate = {};
  for (const s of sheets) {
    byDate[new Date(s.workDate).toDateString()] = s;
  }

  const days = [];
  let totalHours = 0;

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

    const sheet = byDate[day.toDateString()];
    let paid = 0;
    let lunch = 0;
    let inTime = null;
    let outTime = null;

    if (sheet && sheet.clockIn && sheet.clockOut) {
      inTime = roundToQuarterHour(sheet.clockIn);
      outTime = roundToQuarterHour(sheet.clockOut);

      let raw =
        (outTime - inTime) / (1000 * 60 * 60);
      if (raw > 6.5) {
        lunch = 0.5;
        raw -= 0.5;
      }
      if (raw > 0) {
        paid = raw;
        totalHours += paid;
      }
    }

    days.push({
      date: new Date(day),
      clockIn: inTime,
      clockOut: outTime,
      lunchDeducted: lunch,
      paidHours: paid
    });
  }

  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(totalHours - 40, 0);

  res.render("driver/weekly-timesheet", {
    driver,
    days,
    regularHours,
    overtimeHours,
    totalHours,
    weekStart,
    weekEnd
  });
});

/* =========================
   CLOCK IN
========================= */
router.post("/clock-in", async (req, res) => {
  const driver = await User.findById(req.session.userId);
  if (!driver || driver.status !== "active") {
    return res.json({ ok: false });
  }

  const today = startOfToday();

  await Timesheet.findOneAndUpdate(
    { driverId: driver._id, workDate: today },
    {
      $setOnInsert: { driverId: driver._id, workDate: today },
      $set: { clockIn: new Date(), clockOut: null }
    },
    { upsert: true }
  );

  res.json({ ok: true });
});

/* =========================
   CLOCK OUT
========================= */
router.post("/clock-out", async (req, res) => {
  const today = startOfToday();

  await Timesheet.findOneAndUpdate(
    { driverId: req.session.userId, workDate: today },
    { $set: { clockOut: new Date() } }
  );

  res.json({ ok: true });
});


/* =========================
   WEEKLY TIMESHEET – PRINT
========================= */
router.get("/timesheet/week/print", async (req, res) => {
  if (!req.session || req.session.role !== "driver") {
    return res.redirect("/login");
  }

  const driver = await User.findById(req.session.userId).lean();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sheets = await Timesheet.find({
    driverId: req.session.userId,
    workDate: { $gte: weekStart, $lte: weekEnd }
  }).lean();

  const byDate = {};
  for (const s of sheets) {
    byDate[new Date(s.workDate).toDateString()] = s;
  }

  const days = [];
  let totalHours = 0;

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

    const sheet = byDate[day.toDateString()];
    let paid = 0;
    let lunch = 0;
    let inTime = null;
    let outTime = null;

    if (sheet && sheet.clockIn && sheet.clockOut) {
      inTime = roundToQuarterHour(sheet.clockIn);
      outTime = roundToQuarterHour(sheet.clockOut);

      let raw = (outTime - inTime) / (1000 * 60 * 60);
      if (raw > 6.5) {
        lunch = 0.5;
        raw -= 0.5;
      }

      if (raw > 0) {
        paid = raw;
        totalHours += paid;
      }
    }

    days.push({
      date: new Date(day),
      clockIn: inTime,
      clockOut: outTime,
      lunchDeducted: lunch,
      paidHours: paid
    });
  }

  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(totalHours - 40, 0);

  res.render("driver/weekly-timesheet-print", {
    driver,
    days,
    regularHours,
    overtimeHours,
    totalHours,
    weekStart,
    weekEnd
  });
});

module.exports = router;