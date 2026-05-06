const express = require("express");
const User = require("../models/User");
const Timesheet = require("../models/Timesheet");
const Settings = require("../models/Settings");
const { isInsideFence } = require("../middleware/geofence");
const { getHourlyRateForDate } = require("../utils/payRate");

const router = express.Router(); // ✅ THIS WAS MISSING

/* =========================
   Date helpers
========================= */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekSunday() {
  const x = new Date();
  const day = x.getDay(); // 0 = Sunday
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSaturday() {
  const x = startOfWeekSunday();
  x.setDate(x.getDate() + 7); // exclusive
  return x;
}

function startOfYear() {
  const now = new Date();
  const x = new Date(now.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* =========================
   Hours + rounding
========================= */
function rawHoursBetween(start, end) {
  if (!start) return 0;
  const stop = end || new Date();
  return Math.max(0, stop - start) / (1000 * 60 * 60);
}

// 7‑minute rule
function roundDailyHours7MinuteRule(rawHours) {
  const totalMinutes = rawHours * 60;
  const quarter = 15;
  const remainder = totalMinutes % quarter;
  return remainder <= 7
    ? (totalMinutes - remainder) / 60
    : (totalMinutes + (quarter - remainder)) / 60;
}

/* =========================
   Driver Dashboard
========================= */
router.get("/", async (req, res) => {
  if (!req.session || req.session.role !== "driver") {
    return res.redirect("/login");
  }

  const driver = await User.findById(req.session.userId).lean();
  const settings = await Settings.findOne().lean();

  const todayDate = startOfToday();

  const today = await Timesheet.findOne({
    driverId: driver._id,
    workDate: todayDate
  }).lean();

  const hoursToday = today
    ? roundDailyHours7MinuteRule(
        rawHoursBetween(today.clockIn, today.clockOut)
      )
    : 0;

  const weekStart = startOfWeekSunday();
  const weekEnd = endOfWeekSaturday();

  const weekSheets = await Timesheet.find({
    driverId: driver._id,
    workDate: { $gte: weekStart, $lt: weekEnd }
  }).lean();

  let hoursWeek = 0;
  for (const s of weekSheets) {
    hoursWeek += roundDailyHours7MinuteRule(
      rawHoursBetween(s.clockIn, s.clockOut)
    );
  }
  hoursWeek = Math.round(hoursWeek * 100) / 100;

  // Pay today (rate effective today)
  const rateToday = getHourlyRateForDate(driver.payRates || [], todayDate);
  const payToday = Math.round(hoursToday * rateToday * 100) / 100;

  // Pay week (sum daily rounded × effective rate per day)
  let payWeek = 0;
  for (const s of weekSheets) {
    const rate = getHourlyRateForDate(driver.payRates || [], s.workDate);
    const hrs = roundDailyHours7MinuteRule(
      rawHoursBetween(s.clockIn, s.clockOut)
    );
    payWeek += hrs * rate;
  }
  payWeek = Math.round(payWeek * 100) / 100;

  // YTD
  const ytdSheets = await Timesheet.find({
    driverId: driver._id,
    workDate: { $gte: startOfYear(), $lt: new Date() }
  }).lean();

  let payYTD = 0;
  for (const s of ytdSheets) {
    const rate = getHourlyRateForDate(driver.payRates || [], s.workDate);
    const hrs = roundDailyHours7MinuteRule(
      rawHoursBetween(s.clockIn, s.clockOut)
    );
    payYTD += hrs * rate;
  }
  payYTD = Math.round(payYTD * 100) / 100;

  res.render("driver/dashboard", {
    driver,
    settings,
    today,
    hourlyRate: rateToday,
    hoursToday,
    hoursWeek,
    payToday,
    payWeek,
    payYTD
  });
});

module.exports = router;