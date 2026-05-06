
const mongoose = require("mongoose");

const TimesheetSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workDate: { type: Date, required: true },

    clockIn: Date,
    clockOut: Date,

    clockInLocation: {
      lat: Number,
      lng: Number,
      distanceYards: Number,
      passedFence: Boolean
    },

    clockOutLocation: {
      lat: Number,
      lng: Number,
      distanceYards: Number,
      passedFence: Boolean
    }
  },
  { timestamps: true }
);

TimesheetSchema.index({ driverId: 1, workDate: 1 }, { unique: true });

module.exports = mongoose.model("Timesheet", TimesheetSchema);
``