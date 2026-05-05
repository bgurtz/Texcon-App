
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
    phone: { type: String, default: "" },

    active: { type: Boolean, default: true },
    hireDate: { type: Date },
    separationDate: { type: Date },

    driverNote: { type: String, default: "" },

    truckNumber: { type: String, default: "" },
    trailerNumber: { type: String, default: "" },
    truckType: {
      type: String,
      enum: ["", "Bobtail", "Belly Dump", "Super Dump", "End Dump", "Oil Truck", "Water Truck", "Haul Truck"],
      default: ""
    },

    medCardExp: { type: Date },
    dlExp: { type: Date },

    photoPath: { type: String, default: "" },

    payRates: { type: [PayRateSchema], default: [] },

    vacationDays: { type: Number, default: 0 },
    timeOffDays: { type: Number, default: 0 },
    sickDays: { type: Number, default: 0 }
  },
  { timestamps: true }
);

UserSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model("User", UserSchema);
