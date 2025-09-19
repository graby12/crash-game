const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const Bet = require("../models/Bet");
const Register = require("../models/Register");

const router = express.Router();

function auth(req, res, next) {
  const token = req.header("Authorization");
  if (!token)
    return res.status(401).json({ error: "No token, authorization denied" });

  try {
    const rawToken = token.replace("Bearer ", "");
    console.log("🔑 Incoming token:", rawToken.substring(0, 20) + "...");

    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    console.log("✅ Decoded payload:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(400).json({ error: "Invalid token" });
  }
}

// ---------------- PLACE BET ----------------
router.post("/bet", auth, async (req, res) => {
  try {
    const { amount, autoCashOut } = req.body;

    if (!amount || amount < 10) {
      return res
        .status(400)
        .json({ error: "Amount must be at least 10 to place a bet" });
    }

    const user = await Register.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct stake
    user.balance -= amount;
    await user.save();

    // Save bet
    const bet = new Bet({
      userId: user._id,
      amount,
      autoCashOut: autoCashOut && autoCashOut >= 2 ? autoCashOut : null, // optional
      status: "pending",
    });
    await bet.save();

    res.json({
      message: "Bet placed successfully",
      betId: bet._id,
      newBalance: user.balance,
    });
  } catch (err) {
    console.error("❌ Place bet error:", err.message);
    res.status(500).json({ error: "Failed to place bet" });
  }
});

// ---------------- CASHOUT ----------------
router.post("/bet/cashout", auth, async (req, res) => {
  try {
    const { betId, crashMultiplier } = req.body;

    const bet = await Bet.findById(betId).populate("userId");
    if (!bet || bet.status !== "pending") {
      return res.status(400).json({ error: "Invalid or already settled bet" });
    }

    const autoCashOut = bet.autoCashOut || 2; // default to 2x if not set
    let profit = 0;

    if (crashMultiplier >= autoCashOut) {
      profit = bet.amount * autoCashOut;
      bet.status = "won";
      bet.userId.balance += profit;
    } else {
      profit = -bet.amount;
      bet.status = "lost";
    }

    bet.multiplier = crashMultiplier;
    bet.profit = profit;
    await bet.userId.save();
    await bet.save();

    res.json({
      message: bet.status === "won" ? "You won!" : "You lost!",
      profit,
      balance: bet.userId.balance,
      crashMultiplier,
    });
  } catch (err) {
    console.error("❌ Cashout error:", err.message);
    res.status(500).json({ error: "Cashout failed" });
  }
});

// ---------------- HELPER: Phone Normalization ----------------
function formatPhoneForMpesa(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("07") || phone.startsWith("01")) {
    return "254" + phone.substring(1);
  } else if (phone.startsWith("+254")) {
    return phone.replace("+", "");
  } else if (phone.startsWith("254")) {
    return phone;
  }
  return phone;
}

function formatPhoneForDB(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("254")) {
    return "0" + phone.substring(3);
  } else if (phone.startsWith("+254")) {
    return "0" + phone.substring(4);
  }
  return phone;
}

// ---------------- STK PUSH DEPOSIT ----------------
router.post("/deposit", auth, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0) {
      return res.status(400).json({ error: "Phone & valid amount required" });
    }

    const user = await Register.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const phone = formatPhoneForMpesa(phoneNumber);

    // Get MPESA Access Token
    const authHeader = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenResponse = await axios.get(
      process.env.MPESA_ENV === "sandbox"
        ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${authHeader}` } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Prepare STK Push
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const stkResponse = await axios.post(
      process.env.MPESA_ENV === "sandbox"
        ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        : "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "MONEY_GAME",
        TransactionDesc: "Deposit to Money Game",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json({ message: "STK Push sent", data: stkResponse.data });
  } catch (err) {
    console.error("❌ STK push error:", err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// ---------------- STK CALLBACK ----------------
router.post("/stk-callback", async (req, res) => {
  try {
    const result = req.body?.Body?.stkCallback;
    if (!result)
      return res.status(400).json({ error: "Invalid callback data" });

    const { ResultCode, CallbackMetadata } = result;

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const amountItem = items.find((i) => i.Name === "Amount");
      const phoneItem = items.find((i) => i.Name === "PhoneNumber");

      const amount = amountItem?.Value || 0;
      let phoneNumber = phoneItem?.Value?.toString();
      phoneNumber = formatPhoneForDB(phoneNumber);

      const user = await Register.findOne({ phoneNumber });
      if (!user) return res.status(404).json({ error: "User not found" });

      user.balance += amount;
      await user.save();

      console.log(`✅ Deposit of ${amount} successful for ${phoneNumber}`);
    } else {
      console.log(`❌ STK Push failed or cancelled. ResultCode: ${ResultCode}`);
    }

    res.status(200).json({ message: "Callback received" });
  } catch (err) {
    console.error("❌ Callback error:", err.message);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

// ---------------- BALANCE CHECK ----------------
router.get("/balance", auth, async (req, res) => {
  try {
    const user = await Register.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ balance: user.balance });
  } catch (err) {
    console.error("❌ Balance check error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
