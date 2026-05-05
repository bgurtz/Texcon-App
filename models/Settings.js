
const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    geofenceEnabled: { type: Boolean, default: true },
    centerLat: { type: Number, default: 30.796835 },
    centerLng: { type: Number, default: -96.500397 },
    radiusYards: { type: Number, default: 125 },

    globalDriverMessage: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", SettingsSchema);
