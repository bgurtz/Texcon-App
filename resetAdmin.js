
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

(async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected.");

    const username = "Texcon2026";
    const plainPassword = "Pugmill@2026";
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const user = await User.findOneAndUpdate(
      { username },
      {
        role: "admin",
        username,
        passwordHash,
        firstName: "Texcon",
        lastName: "Admin",
        active: true
      },
      {
        upsert: true,   // ✅ CREATE if missing
        new: true
      }
    );

    console.log("✅ Admin user is now GUARANTEED to exist:");
    console.log("   Username:", user.username);
    console.log("   Role:", user.role);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ FAILED:", err);
    process.exit(1);
  }
})();
