
const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  if (req.session.role !== "driver") return res.status(403).send("Forbidden");
  res.render("driver/dashboard");
});

module.exports = router;
