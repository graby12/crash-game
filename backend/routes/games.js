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
    req.userId = decoded.userId;

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

    const user = await Register.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.balance -= amount;
    await user.save();

    const bet = new Bet({
      userId: user._id,
      amount,
      autoCashOut: autoCashOut && autoCashOut >= 2 ? autoCashOut : null,
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

    const autoCashOut = bet.autoCashOut || 2;
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
function formatPhoneForAirtel(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("0")) {
    return "256" + phone.substring(1); // e.g., 0701234567 → 256701234567
  }
  if (phone.startsWith("+256")) {
    return phone.substring(1); // remove +
  }
  return phone;
}

function formatPhoneForDB(phone) {
  // Store locally in 07… format for consistency
  phone = phone.toString().trim();
  if (phone.startsWith("256")) {
    return "0" + phone.substring(3); // 256701234567 → 0701234567
  } else if (phone.startsWith("+256")) {
    return "0" + phone.substring(4);
  }
  return phone;
}

// ---------------- AIRTEL TOKEN HELPER ----------------
async function getAirtelToken() {
  const res = await axios.post(
    `${process.env.AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: "client_credentials",
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return res.data.access_token;
}

// ---------------- AIRTEL DEPOSIT ----------------
router.post("/deposit", auth, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0) {
      return res.status(400).json({ error: "Phone & valid amount required" });
    }

    const user = await Register.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const phone = formatPhoneForAirtel(phoneNumber);
    const accessToken = await getAirtelToken();

    const txnId = "TXN" + Date.now();

    const paymentRes = await axios.post(
      `${process.env.AIRTEL_BASE_URL}/merchant/v1/payments/`,
      {
        reference: txnId,
        subscriber: {
          country: process.env.AIRTEL_COUNTRY || "UG",
          currency: process.env.AIRTEL_CURRENCY || "UGX",
          msisdn: phone,
        },
        transaction: {
          amount: amount,
          country: process.env.AIRTEL_COUNTRY || "UG",
          currency: process.env.AIRTEL_CURRENCY || "UGX",
          id: txnId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Country": process.env.AIRTEL_COUNTRY || "UG",
          "X-Currency": process.env.AIRTEL_CURRENCY || "UGX",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: "Airtel Money deposit initiated",
      data: paymentRes.data,
    });
  } catch (err) {
    console.error(
      "❌ Airtel deposit error:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Deposit failed" });
  }
});

// ---------------- AIRTEL CALLBACK ----------------
router.post("/airtel-callback", async (req, res) => {
  try {
    console.log("📩 Airtel Callback:", JSON.stringify(req.body));

    const { data } = req.body;
    if (!data || !data.transaction) {
      return res.status(400).json({ error: "Invalid callback data" });
    }

    const { status, amount, msisdn } = data.transaction;
    if (status === "SUCCESSFUL") {
      const phoneNumber = formatPhoneForDB(msisdn);
      const user = await Register.findOne({ phoneNumber });

      if (!user) return res.status(404).json({ error: "User not found" });

      user.balance += parseFloat(amount);
      await user.save();

      console.log(`✅ Deposit of ${amount} successful for ${phoneNumber}`);
    } else {
      console.log(`❌ Airtel payment failed. Status: ${status}`);
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
