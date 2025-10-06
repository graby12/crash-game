const jwt = require("jsonwebtoken");
const express = require("express");
const Register = require("../models/Register");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Helper: normalize phone number input
function normalizePhone(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("+256")) return "0" + phone.substring(4);
  if (phone.startsWith("256")) return "0" + phone.substring(3);
  return phone;
}

// ✅ Register user
router.post("/", async (req, res) => {
  const { username, phoneNumber, password } = req.body;

  if (!username || !phoneNumber || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (username.length < 5) {
    return res
      .status(400)
      .json({ error: "Username must be at least 5 characters long" });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: "Password must contain at least one letter and one number",
    });
  }

  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    const existingUser = await Register.findOne({
      phoneNumber: normalizedPhone,
    });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    const newUser = new Register({
      username,
      phoneNumber: normalizedPhone,
      password, // schema will hash automatically
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("❌ Register error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    const user = await Register.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid phone number or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ error: "Invalid phone number or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        phoneNumber: user.phoneNumber,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
