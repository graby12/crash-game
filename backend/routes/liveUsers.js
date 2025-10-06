// routes/liveUsers.js
const express = require("express");
const router = express.Router();
const Register = require("../models/Register");

// Helper: random float with decimals
const randomFloat = (min, max, decimals = 1) => {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
};

// Get live users
router.get("/live-users", async (req, res) => {
  try {
    const users = await Register.find().sort({ createdAt: -1 }).limit(10); // latest 10 users

    const liveUsers = users.map((user) => {
      // 50% chance a user is "not betting"
      const didBet = Math.random() > 0.5;

      if (!didBet) {
        return {
          user: user.username,
          amount: "-",
          multiplier: "-",
          profit: "-",
        };
      }

      // Random bet amount (300 - 10,000)
      const amount = Math.floor(Math.random() * (10000 - 300 + 1)) + 300;

      // Random multiplier (1.1x - 5.0x)
      const multiplier = randomFloat(1.1, 5.0, 2);

      // Profit = amount * multiplier (only if multiplier > 1)
      const profit = (amount * multiplier).toFixed(2);

      return {
        user: user.username,
        amount: amount,
        multiplier: multiplier + "x",
        profit: profit,
      };
    });

    res.json(liveUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch live users" });
  }
});

module.exports = router;
