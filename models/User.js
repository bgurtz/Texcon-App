const mongoose = require("mongoose");

const PayRateSchema = new mongoose.Schema(
  {
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, required: true }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["driver", "admin"], required: true },

    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },

    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },

    /* Employment */
    status: {
      type: String,
      enum: ["active", "resigned", "terminated"],
      default: "active"
    },
    eligibleForRehire: { type: Boolean, default: true },

    /* Equipment */
    truckType: { type: String, default: "" },
    truckNumber: { type: String, default: "" },
    trailerNumber: { type: String, default: "" },

    /* Location */
    yard: { type: String, default: "" },

    /* Payroll */
    hourlyRate: { type: Number, default: 0 },
    payRates: { type: [PayRateSchema], default: [] },

    /* Admin Notes */
    driverNote: { type: String, default: "" },

    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
