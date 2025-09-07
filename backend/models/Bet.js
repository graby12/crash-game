const mongoose = require("mongoose");

const betSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Register" },
    amount: { type: Number, required: true },
    autoCashOut: { type: Number, required: true }, // add this
    multiplier: { type: Number },
    status: {
      type: String,
      enum: ["pending", "won", "lost"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bet", betSchema);
