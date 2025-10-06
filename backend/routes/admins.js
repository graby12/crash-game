const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Load admin credentials from .env
const admins = [
  { email: process.env.ADMIN_1_EMAIL, password: process.env.ADMIN_1_PASSWORD },
  { email: process.env.ADMIN_2_EMAIL, password: process.env.ADMIN_2_PASSWORD },
];

// 🔹 Admin login route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const admin = admins.find(
    (a) => a.email === email && a.password === password
  );

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // ✅ Create JWT token
  const token = jwt.sign(
    { email: admin.email, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// 🔹 Middleware to protect admin-only routes
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(403).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1]; // Expecting "Bearer <token>"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") throw new Error();
    req.admin = decoded; // Attach admin info to request
    next();
  } catch {
    return res.status(403).json({ message: "Unauthorized" });
  }
}

module.exports = { router, verifyAdmin };
