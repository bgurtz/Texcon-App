
# ==========================
# Texcon App Repair Script
# ==========================

Write-Host "Fixing Texcon App..."

# -------- admin.js --------
@"
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
"@ | Set-Content routes\admin.js -Encoding UTF8

# -------- admin dashboard --------
@"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Texcon - Admin</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="/public/css/styles.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container py-4">

  <h2 class="texcon-red">Texcon</h2>
  <div class="text-muted mb-3">Developed by Brian Gurtz</div>

  <div class="d-flex justify-content-between mb-3">
    <strong>Admin Dashboard</strong>
    <a href="/logout">Log out</a>
  </div>

  <div class="card card-soft shadow-sm">
    <div class="card-body">
      <p>Next: driver management, geofence toggle, G‑codes, timesheet edits, weekly print.</p>
      <a class="btn btn-dark" href="/admin/drivers">Drivers</a>
    </div>
  </div>

</div>
</body>
</html>
"@ | Set-Content views\admin\dashboard.ejs -Encoding UTF8

# -------- drivers page --------
@"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drivers</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="/public/css/styles.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container py-4">

<a href="/admin">← Back</a>
<h3 class="texcon-red mt-2">Drivers</h3>

<form method="POST" action="/admin/drivers/create" class="mt-3">
  <input class="form-control mb-2" name="username" placeholder="Username" required>
  <input class="form-control mb-2" name="password" placeholder="Password" type="password" required>
  <button class="btn btn-dark">Create Driver</button>
</form>

<table class="table table-sm mt-4">
<thead>
<tr><th>Name</th><th>Username</th></tr>
</thead>
<tbody>
<% drivers.forEach(d => { %>
<tr>
<td><%= d.lastName %>, <%= d.firstName %></td>
<td><%= d.username %></td>
</tr>
<% }) %>
</tbody>
</table>

</div>
</body>
</html>
"@ | Set-Content views\admin\drivers.ejs -Encoding UTF8

Write-Host "✅ Texcon App repaired."
Write-Host "Now run: npm start"
