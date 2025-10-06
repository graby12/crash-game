const express = require("express");
const Register = require("../models/Register");

const router = express.Router();

// ✅ Get all users (for admin dashboard)
router.get("/", async (req, res) => {
  try {
    const users = await Register.find(
      {},
      "username phoneNumber balance createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    // Format response
    const formatted = users.map((u) => ({
      id: u._id,
      username: u.username,
      phoneNumber: u.phoneNumber,
      balance: u.balance,
      createdAt: u.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Fetch users error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 👇 THIS is what you were missing
module.exports = router;
