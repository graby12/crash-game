// server.js or routes/liveUsers.js
const express = require('express');
const router = express.Router();
const Register = require('../models/Register');

// Get live users
router.get('/live-users', async (req, res) => {
  try {
    const users = await Register.find().sort({ createdAt: -1 }).limit(10); // latest 10 users
    const liveUsers = users.map(user => ({
      user: user.username,
      amount: user.balance,
      profit: Math.floor(Math.random() * 100) // or calculate real profit
    }));
    res.json(liveUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch live users' });
  }
});

module.exports = router;
