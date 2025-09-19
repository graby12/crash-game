import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import CrashGame from "./CrashGame.jsx";
import TermsModal from "./TermsModal.jsx"; // ✅ fixed terms modal

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SOCKET_URL = "https://crash-game-sse3.onrender.com";

const Homepage = () => {
  const navigate = useNavigate();

  // ---------------- STATES ----------------
  const [betAmount, setBetAmount] = useState('');
  const [autoCashOut, setAutoCashOut] = useState(2);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [isDepositProcessing, setIsDepositProcessing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false); // ✅ terms modal state

  // ---------------- FETCH USER BALANCE ----------------
  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("https://crash-game-sse3.onrender.com/api/bet/balance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.balance !== undefined) setAvailableBalance(res.data.balance);
    } catch (err) {
      console.error("Error fetching user balance:", err);
    }
  };

  // ---------------- WEBSOCKET ----------------
  useEffect(() => {
    fetchUserBalance();
    const socket = io(SOCKET_URL);

    socket.on("connect", () => console.log("🟢 Connected to WebSocket"));
    socket.on("disconnect", () => console.log("🔴 Disconnected from WebSocket"));

    socket.on("depositSuccess", (data) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = jwtDecode(token);
        if (data.userId === decoded.userId) {
          setAvailableBalance(data.balance);
          setSuccessMessage(`Deposit of ${data.amount} successful!`);
        }
      } catch {}
    });

    socket.on("balanceUpdated", (data) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = jwtDecode(token);
        if (data.userId === decoded.userId) setAvailableBalance(data.newBalance);
      } catch {}
    });

    return () => socket.disconnect();
  }, []);

  // ----------------- BET FUNCTION -----------------
  const handleBet = async () => {
    if (!betAmount || isNaN(parseFloat(betAmount))) { setErrorMessage("Enter a valid bet amount"); return; }
    if (parseFloat(betAmount) < 10) { setErrorMessage("Minimum staking is KES 10"); return; }
    if (parseFloat(betAmount) > availableBalance) { setErrorMessage("Insufficient balance"); return; }
    setErrorMessage("");

    try {
      const res = await axios.post("https://crash-game-sse3.onrender.com/api/bet", {
        amount: parseFloat(betAmount),
        autoCashOut: parseFloat(autoCashOut)
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

      if (res.data) {
        setAvailableBalance(res.data.newBalance);
        setSuccessMessage("Bet placed successfully!");
        await fetchUserBalance();
      }
    } catch (error) {
      console.error("Bet API error:", error);
      setErrorMessage(error.response?.data?.error || "Error placing bet");
    }
  };

  // ----------------- WITHDRAW FUNCTION -----------------
  const handleWithdraw = () => setIsPopupOpen(true);
  const confirmWithdraw = async () => {
    if (parseFloat(withdrawAmount) < 300) { setErrorMessage("Minimum withdrawal is KES 300"); return; }
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.post("https://crash-game-sse3.onrender.com/api/bet/cashout", {
        amount: parseFloat(withdrawAmount)
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data) {
        setAvailableBalance(res.data.balance);
        setSuccessMessage("Withdrawal successful!");
        setIsPopupOpen(false);
        setWithdrawAmount('');
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      setErrorMessage(err.response?.data?.error || "Error withdrawing funds");
    }
  };

  // ----------------- DEPOSIT FUNCTION -----------------
  const handleDeposit = () => setIsDepositPopupOpen(true);
  const confirmDeposit = async () => {
    if (!depositPhone.match(/^(?:2547\d{8}|07\d{8})$/)) { setErrorMessage("Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX"); return; }
    if (parseFloat(depositAmount) < 50) { setErrorMessage("Minimum deposit is KES 50"); return; }
    setErrorMessage('');
    setIsDepositProcessing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = jwtDecode(token);
      const userId = decoded.userId;
      const res = await axios.post("https://crash-game-sse3.onrender.com/api/bet/deposit", {
        userId,
        amount: parseFloat(depositAmount),
        phoneNumber: depositPhone
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data) {
        setSuccessMessage("STK Push sent! Check your phone to complete payment.");
        setIsDepositPopupOpen(false);
        setDepositAmount('');
        setDepositPhone('');
      }
    } catch (err) {
      console.error("Deposit error:", err.response?.data || err.message);
      setErrorMessage(err.response?.data?.error || "Error sending deposit STK push");
    } finally {
      setIsDepositProcessing(false);
    }
  };

  // ----------------- CLOSE POPUPS -----------------
  const closePopup = () => setIsPopupOpen(false);
  const closeDepositPopup = () => setIsDepositPopupOpen(false);
  const handleLogOut = () => navigate('/');

  // ----------------- RENDER -----------------
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      {/* header, main, popups, footer same as your version */}
      {/* ... */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};

// 🔥 Transaction messages component (unchanged)
const TransactionMessages = () => {
  // ... same as your version
};

export default Homepage;
