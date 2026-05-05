
const express = require("express");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("index", { error: null });
});

router.post(
  "/login",
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.render("index", { error: "Missing username/password." });

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.active) return res.render("index", { error: "Invalid login." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.render("index", { error: "Invalid login." });

    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.username = user.username;

    return res.redirect(user.role === "admin" ? "/admin" : "/driver");
  }
);

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
