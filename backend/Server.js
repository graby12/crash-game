// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

// Models & routes
const Register = require("./models/Register");
const Bet = require("./models/Bet");
const registerRoutes = require("./routes/register");
const gamesRoutes = require("./routes/games");
const generateCrashMultiplier = require("./routes/random");

const app = express();
const server = http.createServer(app);

// ---------- Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

// ---------- Middlewares ----------
app.use(cors());
app.use(bodyParser.json());
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// ---------- JWT Auth Middleware ----------
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ error: "Authorization token required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ---------- Connect MongoDB ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ---------- Mount Routes ----------
app.use("/api/register", registerRoutes);
app.use("/api/bet", gamesRoutes);

// ---------- HELPER: Phone Normalization ----------
function formatPhoneForMpesa(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("07")) return "254" + phone.substring(1);
  if (phone.startsWith("+254")) return phone.replace("+", "");
  if (phone.startsWith("254")) return phone;
  return phone;
}

function formatPhoneForDB(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("254")) return "0" + phone.substring(3);
  if (phone.startsWith("+254")) return "0" + phone.substring(4);
  return phone;
}

// ---------- STK PUSH DEPOSIT ----------
app.post("/api/deposit", authMiddleware, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0)
      return res.status(400).json({ error: "Phone & valid amount required" });

    const user = await Register.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

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
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");
    const phone = formatPhoneForMpesa(phoneNumber);

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
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// ---------- STK CALLBACK ----------
app.post("/api/stk-callback", async (req, res) => {
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
      phoneNumber = formatPhoneForDB(phoneNumber);

      const user = await Register.findOne({ phoneNumber });
      if (!user) {
        console.warn("STK callback: user not found for phone", phoneNumber);
        return res.status(404).json({ error: "User not found" });
      }

      user.balance += amount;
      await user.save();

      io.emit("balanceUpdated", {
        userId: user._id.toString(),
        newBalance: user.balance,
        amount,
      });
      if (onlineUsers.has(user._id.toString())) {
        const socketId = onlineUsers.get(user._id.toString());
        io.to(socketId).emit(`balanceUpdated-${user._id.toString()}`, {
          newBalance: user.balance,
          amount,
        });
      }

      console.log(`✅ Deposit of ${amount} successful for ${phoneNumber}`);
    } else {
      console.log(`❌ STK Push failed or cancelled. ResultCode: ${ResultCode}`);
    }

    return res.status(200).json({ message: "Callback received" });
  } catch (err) {
    console.error("STK callback processing failed:", err.message);
    return res.status(500).json({ error: "Callback processing failed" });
  }
});

// ---------- BALANCE CHECK ----------
app.get("/api/balance", authMiddleware, async (req, res) => {
  try {
    const user = await Register.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Live Users ----------
app.get("/api/live-users", async (req, res) => {
  try {
    const users = await Register.find().sort({ createdAt: -1 }).limit(10);

    const liveUsers = users.map((user) => {
      const didBet = Math.random() > 0.5;
      if (!didBet) {
        return {
          user: user.username,
          amount: "-",
          multiplier: "-",
          profit: "-",
        };
      }
      const amount = Math.floor(Math.random() * (10000 - 300 + 1)) + 300;
      const multiplier = (Math.random() * (5 - 1.1) + 1.1).toFixed(2);
      const profit = (amount * multiplier).toFixed(2);
      return {
        user: user.username,
        amount,
        multiplier: `${multiplier}x`,
        profit,
      };
    });

    res.status(200).json(liveUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch live users" });
  }
});

// ---------- Test Route ----------
app.get("/", (req, res) => res.send("Backend server is running!"));

// ---------- Socket.IO ----------
io.on("connection", (socket) => {
  console.log("🟢 User connected (socket):", socket.id);

  socket.on("registerUser", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    console.log(`📡 Registered user ${userId} -> socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`🗑️ Removed ${userId} from onlineUsers`);
        break;
      }
    }
  });
});

// ---- Crash Game Engine ----
let gameState = {
  status: "waiting", // waiting | countdown | running | crashed
  countdown: null,
  crashPoint: null,
  multiplier: 1,
  startTime: null,
  history: [],
};

function startCountdown() {
  gameState.status = "countdown";
  gameState.countdown = 5.0;
  io.emit("countdown", gameState.countdown);

  const countdownInterval = setInterval(() => {
    gameState.countdown = parseFloat((gameState.countdown - 0.1).toFixed(1));
    if (gameState.countdown <= 0) {
      clearInterval(countdownInterval);
      startRound();
    } else {
      io.emit("countdown", gameState.countdown);
    }
  }, 100);
}

function startRound() {
  gameState.status = "running";
  gameState.crashPoint = generateCrashMultiplier();
  gameState.multiplier = 1;
  gameState.startTime = Date.now();

  io.emit("roundStarted", { crashPoint: gameState.crashPoint });

  const growthRate = 0.18;

  const loop = () => {
    if (gameState.status !== "running") return;

    const elapsed = (Date.now() - gameState.startTime) / 1000;
    const current = Math.exp(growthRate * elapsed);

    if (current >= gameState.crashPoint) {
      gameState.status = "crashed";
      gameState.multiplier = gameState.crashPoint;
      gameState.history.unshift(`${gameState.crashPoint.toFixed(2)}x`);
      gameState.history = gameState.history.slice(0, 20);

      io.emit("roundEnded", {
        crashPoint: gameState.crashPoint.toFixed(2),
        history: gameState.history,
      });

      setTimeout(() => startCountdown(), 5000);
      return;
    }

    gameState.multiplier = current;
    io.emit("multiplierUpdate", { multiplier: current, elapsed });

    setTimeout(loop, 50); // smoother updates
  };

  loop();
}

// Start first countdown when server boots
startCountdown();

// ---------- Start ----------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
