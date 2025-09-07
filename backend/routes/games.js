const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const Bet = require("../models/Bet");
const Register = require("../models/Register");

const router = express.Router();

// ---------------- AUTH MIDDLEWARE ----------------
function auth(req, res, next) {
  const token = req.header("Authorization");
  if (!token)
    return res.status(401).json({ error: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ error: "Invalid token" });
  }
}

// ---------------- PLACE BET ----------------
router.post("/bet", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Amount is required and must be greater than 0" });
    }

    const user = await Register.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct user balance
    user.balance -= amount;
    await user.save();

    // Place bet without requiring autoCashOut
    const bet = new Bet({ userId: user._id, amount, status: "pending" });
    await bet.save();

    res.json({ message: "Bet placed", betId: bet._id, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SIMULATE CRASH MULTIPLIER ----------------
router.get("/crash", async (req, res) => {
  try {
    const crashPoint = (Math.random() * 10).toFixed(2);
    res.json({ crashPoint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- CASHOUT ----------------
router.post("/cashout", auth, async (req, res) => {
  try {
    const { betId } = req.body;
    const bet = await Bet.findById(betId).populate("userId");

    if (!bet || bet.status !== "pending") {
      return res.status(400).json({ error: "Invalid bet" });
    }

    // Simulate crash
    const crashMultiplier = parseFloat((Math.random() * 10).toFixed(2));

    // Default autoCashOut = 2x
    const autoCashOut = 2;
    let winnings = 0;

    if (crashMultiplier >= autoCashOut) {
      winnings = bet.amount * autoCashOut;
      bet.status = "won";
      bet.userId.balance += winnings;
      await bet.userId.save();
    } else {
      bet.status = "lost";
    }

    bet.multiplier = crashMultiplier;
    bet.autoCashOut = autoCashOut;
    await bet.save();

    res.json({
      message: bet.status === "won" ? "You won!" : "You lost!",
      winnings,
      balance: bet.userId.balance,
      crashMultiplier,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- HELPER: Phone Normalization ----------------
function formatPhoneForMpesa(phone) {
  // Always send to Safaricom in 2547XXXXXXX format
  phone = phone.toString().trim();
  if (phone.startsWith("07")) {
    return "254" + phone.substring(1); // 07XXXXXXXX -> 2547XXXXXXXX
  } else if (phone.startsWith("+254")) {
    return phone.replace("+", ""); // +2547XXXXXXXX -> 2547XXXXXXXX
  } else if (phone.startsWith("254")) {
    return phone; // already in correct format
  }
  return phone;
}

function formatPhoneForDB(phone) {
  // Always store & match users in DB with 07XXXXXXXX format
  phone = phone.toString().trim();
  if (phone.startsWith("254")) {
    return "0" + phone.substring(3); // 2547XXXXXXXX -> 07XXXXXXXX
  } else if (phone.startsWith("+254")) {
    return "0" + phone.substring(4); // +2547XXXXXXXX -> 07XXXXXXXX
  }
  return phone;
}

// ---------------- STK PUSH DEPOSIT ----------------
router.post("/deposit", async (req, res) => {
  try {
    const { userId, phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount)
      return res.status(400).json({ error: "Phone & amount required" });

    const user = await Register.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Normalize phone for MPESA
    const phone = formatPhoneForMpesa(phoneNumber);

    // Get MPESA Access Token
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenResponse = await axios.get(
      process.env.MPESA_ENV === "sandbox"
        ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
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
        PartyA: phone, // ✅ formatted for MPESA
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone, // ✅ formatted for MPESA
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "MONEY_GAME",
        TransactionDesc: "Deposit to Money Game",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json({ message: "STK Push sent", data: stkResponse.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// ---------------- STK CALLBACK ----------------
router.post("/stk-callback", async (req, res) => {
  try {
    const callbackData = req.body;

    const result = callbackData?.Body?.stkCallback;
    if (!result)
      return res.status(400).json({ error: "Invalid callback data" });

    const { ResultCode, CallbackMetadata } = result;

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item;
      const amountItem = items.find((i) => i.Name === "Amount");
      const phoneItem = items.find((i) => i.Name === "PhoneNumber");

      const amount = amountItem?.Value || 0;
      let phoneNumber = phoneItem?.Value?.toString();

      // ✅ Normalize back to DB format (07XXXXXXXX)
      phoneNumber = formatPhoneForDB(phoneNumber);

      const user = await Register.findOne({ phoneNumber });
      if (!user) return res.status(404).json({ error: "User not found" });

      user.balance += amount;
      await user.save();

      console.log(`Deposit of ${amount} successful for ${phoneNumber}`);
    } else {
      console.log(`STK Push failed or cancelled. ResultCode: ${ResultCode}`);
    }

    res.status(200).json({ message: "Callback received" });
  } catch (err) {
    console.error(err.message);
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
