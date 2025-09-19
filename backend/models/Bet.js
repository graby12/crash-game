const mongoose = require("mongoose");

const betSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    amount: { type: Number, required: true, min: 10 }, // min bet amount
    autoCashOut: { type: Number, default: null }, // optional, must be >= 2 if set
    multiplier: { type: Number, default: null }, // crash multiplier reached
    profit: { type: Number, default: 0 }, // winnings (+) or loss (-)
    status: {
      type: String,
      enum: ["pending", "won", "lost"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bet", betSchema);
