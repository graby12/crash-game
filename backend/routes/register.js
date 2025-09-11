const jwt = require("jsonwebtoken");
const express = require("express");
const Register = require("../models/Register");
const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp"); // ✅ Import OTP model

const router = express.Router();

// Generate OTP (3 minutes expiry)
router.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    // Save OTP with 3-min expiry
    const newOtp = new Otp({
      phoneNumber,
      otp,
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // ⏰ 3 minutes
    });

    await newOtp.save();

    // 👉 TODO: integrate SMS provider (like Twilio) to send OTP to phoneNumber
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: "Phone number and OTP are required" });
  }

  try {
    const record = await Otp.findOne({ phoneNumber, otp });

    if (!record) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    await Otp.deleteMany({ phoneNumber }); // ✅ Clear old OTPs once verified
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Register user (after OTP verification)
// Register user (with OTP verification)
router.post("/", async (req, res) => {
  const { username, phoneNumber, password, otp } = req.body;

  if (!username || !phoneNumber || !password || !otp) {
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
    const existingUser = await Register.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    // ✅ Check OTP
      const otpRecord = await Otp.findOne({ phoneNumber, otp });
      if (!otpRecord) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
      if (otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: "OTP expired" });
      }


    // ✅ OTP valid → delete it so it can’t be reused
    await Otp.deleteMany({ phoneNumber });

    const newUser = new Register({ username, phoneNumber, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    const user = await Register.findOne({ phoneNumber });
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
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
