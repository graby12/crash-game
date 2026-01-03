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
  const [multiplierData, setMultiplierData] = useState([]);
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
        headers: { Authorization: `Bearer ${localStorage.getItem(token)}` }
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

  // ❌ Old confirmDeposit (STK Push) — hashed out for future use
  /*
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
  */

  // ✅ New confirmDeposit for Airtel instructions
  const confirmDeposit = () => {
    setSuccessMessage("Deposit instructions completed, waiting for confirmation...");
    setIsDepositPopupOpen(false);
  };

  // ----------------- CLOSE POPUPS -----------------
  const closePopup = () => setIsPopupOpen(false);
  const closeDepositPopup = () => setIsDepositPopupOpen(false);
  const handleLogOut = () => navigate('/');

  // ----------------- RENDER -----------------
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 fixed top-0 w-full z-50">
        {/* Desktop / Tablet Header */}
        <div className="hidden sm:flex flex-col sm:flex-row items-center p-4">
          <div className="text-lg sm:text-xl font-bold flex-1 text-center sm:text-left mb-2 sm:mb-0">
            MONEY GRAPH
          </div>
          <div className="flex flex-col sm:flex-row sm:space-x-4 flex-1 justify-center text-sm sm:text-base mb-2 sm:mb-0">
            <button onClick={handleWithdraw} className="hover:text-orange-500">WITHDRAW</button>
            <button onClick={handleDeposit} className="hover:text-orange-500">DEPOSIT</button>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-orange-500">TERMS OF SERVICE</button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 flex-1 justify-center sm:justify-end text-sm sm:text-base">
            <span className="bg-gray-600 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-center">
              UGX {availableBalance}
            </span>
            <span className="hidden sm:block">KKK5249201</span>
            <button
              onClick={handleLogOut}
              className="bg-red-600 px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-red-500 mt-2 sm:mt-0"
            >
              LOG OUT
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-4 relative">
          <button
            className="text-white text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* ✅ Balance + Deposit only */}
          <div className="flex flex-row items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
            <span className="px-3 py-1 bg-gray-700 rounded-md text-white font-semibold">
              UGX {availableBalance}
            </span>
            <button
              onClick={handleDeposit}
              className="px-3 py-1 bg-orange-600 rounded-md hover:bg-orange-500 text-white text-sm"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed top-0 left-0 h-full w-56 bg-gray-800 text-white shadow-lg z-50 sm:hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="font-semibold">Menu</h2>
              <button
                className="text-white text-xl"
                onClick={() => setMenuOpen(false)}
              >
                ✖
              </button>
            </div>
            <div className="flex flex-col">
              <button onClick={() => { handleWithdraw(); setMenuOpen(false); }} className="px-4 py-3 hover:bg-gray-700 text-left">Withdraw</button>
              <button onClick={() => { setIsTermsOpen(true); setMenuOpen(false); }} className="px-4 py-3 hover:bg-gray-700 text-left">Terms of Service</button>
              <button onClick={() => { handleLogOut(); setMenuOpen(false); }} className="px-4 py-3 hover:bg-gray-700 text-left">Log Out</button>
            </div>
          </div>
        )}
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto pt-28 pb-12 px-4 sm:px-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Crash Game */}
          <div className="w-full bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl text-center mb-4">Crash Game Multiplier</h2>
            <CrashGame showControls={true}/>
          </div>
        </div>

        {/* 🔥 Transaction Messages */}
        <TransactionMessages />
      </main>

      {/* Footer */}
      <footer className="bg-orange-500 text-center py-2 sm:py-4 mt-6">
        <p className="text-white text-sm sm:text-base">SPECIAL HAPPY HOUR DEAL!</p>
        <p className="text-white text-xs sm:text-sm">GET 10% OF YOUR LOSSES ALL WEEK BETWEEN 8AM - 10AM</p>
      </footer>

      {/* Withdraw Popup */}
      {isPopupOpen && (  
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-11/12 sm:w-2/3 md:w-1/3 space-y-4">
            <h3 className="text-xl sm:text-2xl font-semibold text-center">Withholding Tax Notice</h3>
            <p>
              As provided for by the Income Tax Act, Cap 472, all gaming companies are required to
              withhold winnings at a rate of 20%. MoneyGraph will deduct and remit 20% of all winnings to URA.
            </p>
            <div className="space-y-2">
              <input type="number" className="p-2 rounded bg-gray-800 text-white w-full border border-gray-500"
                value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter withdrawal amount" />
              {withdrawAmount < 100000 && withdrawAmount !== '' && (
                <p className="text-red-500 text-sm">Minimum withdrawal is KES 100,000</p>
              )}
            </div>
            <div className="space-y-2 text-sm sm:text-base">
              <div className="flex justify-between">
                <span>Withholding Tax</span>
                <span>{withdrawAmount ? (-(withdrawAmount * 0.2)).toFixed(2) : '-0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Withdraw Fee</span>
                <span>-16</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Disbursed Amount</span>
                <span>{withdrawAmount ? (withdrawAmount - withdrawAmount * 0.2 - 16).toFixed(2) : '-0'}</span>
              </div>
            </div>
            <div className="flex justify-between mt-4 space-x-2">
              <button onClick={closePopup} className="bg-red-600 py-2 px-4 rounded-lg w-1/2">CLOSE</button>
              <button onClick={confirmWithdraw} className="bg-blue-600 py-2 px-4 rounded-lg w-1/2">WITHDRAW</button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Popup */}
      {isDepositPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-11/12 sm:w-2/3 md:w-1/3 space-y-4">
            <h3 className="text-xl sm:text-2xl font-semibold text-center">Deposit Funds</h3>
            <div className="space-y-2 text-sm sm:text-base">
              <p>Follow the steps below to deposit via Airtel Money:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Dial <strong>*185*9#</strong></li>
                <li>Enter Merchant ID – <strong>6888198</strong></li>
                <li>Enter Amount – (Minimum 10,000 UGX)</li>
                <li>Reference Number – (Your Name or Your Phone Number)</li>
                <li>Enter Your 4-Digit Airtel Money PIN</li>
              </ol>
             <p className="mt-2 text-yellow-400 text-xs">
                 Note: Your account balance will be updated automatically after confirmation. 
              </p> 
            </div>
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
            <div className="flex justify-between mt-4 space-x-2">
              <button onClick={closeDepositPopup} className="bg-red-600 py-2 px-4 rounded-lg w-1/2">CLOSE</button>
              <button onClick={confirmDeposit} className="bg-blue-600 py-2 px-4 rounded-lg w-1/2">DONE</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};

// Transaction messages
// Transaction messages
const TransactionMessages = () => {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const fadeInTimer = useRef(null);
  const fadeOutTimer = useRef(null);
  const intervalRef = useRef(null);

  // Generate random TID (12-digit number)
  const randomTid = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  // Generate random amount with given distribution
  const randomAmount = () => {
    const roll = Math.random();
    if (roll < 0.2) {
      // 20% chance
      return Math.floor(Math.random() * (100000 - 20000 + 1)) + 20000;
    } else if (roll < 0.5) {
      // 30% chance
      return Math.floor(Math.random() * (450000 - 100000 + 1)) + 100000;
    } else {
      // 50% chance
      return Math.floor(Math.random() * (1200000 - 450000 + 1)) + 450000;
    }
  };

  const fmt = (n) =>
    Number(n).toLocaleString("en-UG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-GB"); // dd/mm/yyyy
  };

  const randomTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const showOne = () => {
      const tid = randomTid();
      const amount = randomAmount();
      const msg = `RECEIVED. TID ${tid}. UGX ${fmt(amount)} from Money Graph on ${getFormattedDate()} at ${randomTime()}. View txns on MyAirtel App https://bit.ly/3ZgpiNw`;

      setMessage(msg);
      setVisible(false);

      if (fadeInTimer.current) clearTimeout(fadeInTimer.current);
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);

      fadeInTimer.current = setTimeout(() => setVisible(true), 100);
      fadeOutTimer.current = setTimeout(() => setVisible(false), 5000);
    };

    showOne();
    intervalRef.current = setInterval(showOne, 7000);

    return () => {
      clearInterval(intervalRef.current);
      if (fadeInTimer.current) clearTimeout(fadeInTimer.current);
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
    };
  }, []);

  return (
    <div className="h-24 relative mb-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm px-4 py-2 bg-green-600 rounded-lg shadow-md"
        role="status"
        aria-live="polite"
      >
        {message}
      </motion.div>
    </div>
  );
};

export default Homepage;