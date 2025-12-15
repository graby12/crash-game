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
const adminRoutes = require("./routes/admin");
const { router: adminsRoutes, verifyAdmin } = require("./routes/admins");

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
app.use("/api/admin", adminRoutes); // legacy admin
app.use("/admins", adminsRoutes); // JWT admin

// Example protected route for admins
app.get("/admins/secret", verifyAdmin, (req, res) => {
  res.json({ message: `Hello ${req.admin.email}, welcome to the admin area!` });
});

// ---------- Phone Helpers (Airtel Uganda) ----------
function formatPhoneForAirtel(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("0")) return "256" + phone.substring(1);
  if (phone.startsWith("+256")) return phone.substring(1);
  if (phone.startsWith("256")) return phone;
  return phone;
}
function formatPhoneForDB(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("256")) return "0" + phone.substring(3);
  if (phone.startsWith("+256")) return "0" + phone.substring(4);
  return phone;
}

// ---------- Airtel Token Helper ----------
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

// ---------- Airtel Deposit ----------
app.post("/api/deposit", authMiddleware, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0) {
      return res.status(400).json({ error: "Phone & valid amount required" });
    }

    const user = await Register.findById(req.userId);
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

// ---------- Airtel Callback ----------
app.post("/api/airtel-callback", async (req, res) => {
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
      console.log(`❌ Airtel payment failed. Status: ${status}`);
    }

    res.status(200).json({ message: "Callback received" });
  } catch (err) {
    console.error("❌ Callback error:", err.message);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

// ---------- Balance Check ----------
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
  status: "waiting",
  countdown: null,
  crashPoint: null,
  multiplier: 1,
  startTime: null,
  history: [],
};

// --- Namespaces ---
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

// Admin namespace
const adminNamespace = io.of("/admin");
adminNamespace.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  socket.join("admins");

  socket.on("disconnect", () => {
    console.log("Admin disconnected:", socket.id);
  });
});

// --- Game Logic ---
// Initialize a queue of upcoming crash points
gameState.upcomingCrashPoints = [];

function ensureUpcomingCrashPoints(count = 10) {
  while (gameState.upcomingCrashPoints.length < count) {
    gameState.upcomingCrashPoints.push(generateCrashMultiplier());
  }
}

function startCountdown() {
  gameState.status = "countdown";
  gameState.countdown = 5.0;

  // ✅ Ensure we have 10 upcoming crash points
  ensureUpcomingCrashPoints(10);

  // ✅ Pick the first crash point for this round
  gameState.crashPoint = gameState.upcomingCrashPoints.shift();

  // ✅ Send next 10 crash points to admins only
  adminNamespace.to("admins").emit("upcomingCrashPoints", {
    upcoming: gameState.upcomingCrashPoints.map((cp) => cp.toFixed(2)),
    timestamp: new Date(),
  });

  // Normal users see countdown only
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
  gameState.multiplier = 1;
  gameState.startTime = Date.now();

  // ✅ Users only learn crashPoint now
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

      // ✅ Send to all users
      io.emit("roundEnded", {
        crashPoint: gameState.crashPoint.toFixed(2),
        history: gameState.history,
      });

      // ✅ Also send to admins
      adminNamespace.to("admins").emit("roundEnded", {
        crashPoint: gameState.crashPoint.toFixed(2),
        history: gameState.history,
      });

      // ✅ Start next countdown
      setTimeout(() => startCountdown(), 5000);
      return;
    }

    gameState.multiplier = current;
    io.emit("multiplierUpdate", { multiplier: current, elapsed });
    setTimeout(loop, 50);
  };

  loop();
}

// Start the first countdown
startCountdown();

// ---------- Start Server ----------
const PORT = process.env.PORT;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
