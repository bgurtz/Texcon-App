const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

router.get("/", (req, res) => {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.redirect("/login");
  }
  res.render("admin/dashboard");
});

router.get("/drivers", async (req, res) => {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.redirect("/login");
  }
  const drivers = await User.find({ role: "driver" }).sort({
    lastName: 1,
    firstName: 1
  });
  res.render("admin/drivers", { drivers });
});

router.post("/drivers/create", async (req, res) => {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.redirect("/login");
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);

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
    active: true
  });

  res.redirect("/admin/drivers");
});

module.exports = router;
