require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const bcrypt = require("bcrypt");

const connectDB = require("./config/db");
const User = require("./models/User");
const Settings = require("./models/Settings");

const authRoutes = require("./routes/auth");
const driverRoutes = require("./routes/driver");
const adminRoutes = require("./routes/admin");

const app = express();

(async () => {
  await connectDB(process.env.MONGO_URI);

  let settings = await Settings.findOne();
  if (!settings) {
    await Settings.create({
      geofenceEnabled: process.env.GEOFENCE_ENABLED !== "false",
      centerLat: Number(process.env.GEOFENCE_CENTER_LAT || 30.796835),
      centerLng: Number(process.env.GEOFENCE_CENTER_LNG || -96.500397),
      radiusYards: Number(process.env.GEOFENCE_RADIUS_YARDS || 125)
    });
  }

  const adminExists = await User.exists({ role: "admin" });
  if (!adminExists) {
    const username = process.env.SEED_ADMIN_USERNAME || "Texcon2026";
    const password = process.env.SEED_ADMIN_PASSWORD || "Pugmill@2026";
    const hash = await bcrypt.hash(password, 12);

    await User.create({
      role: "admin",
      username,
      passwordHash: hash,
      firstName: "Texcon",
      lastName: "Admin",
      active: true
    });

    console.log("✅ Seeded initial admin:", username);
  }

  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
      cookie: { maxAge: 1000 * 60 * 60 * 12 }
    })
  );

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.static(path.join(__dirname, "public")));

  app.use(async (req, res, next) => {
    res.locals.session = req.session;
    res.locals.settings = await Settings.findOne();
    next();
  });

  app.get("/", (req, res) => res.redirect("/login"));

  app.use(authRoutes);
  app.use("/driver", driverRoutes);
  app.use("/admin", adminRoutes);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ Running: http://localhost:${PORT}/login`));
})();