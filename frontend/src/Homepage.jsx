import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import io from 'socket.io-client';
import CrashGame from "./CrashGame.jsx";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SOCKET_URL = "https://crash-game-sse3.onrender.com";

const Homepage = () => {
  const navigate = useNavigate();

  // ---------------- STATES ----------------
  const [betAmount, setBetAmount] = useState('');
  const [autoCashOut, setAutoCashOut] = useState(2);
  const [liveUsers, setLiveUsers] = useState([]);
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

  // ---------------- FETCH CRASH MULTIPLIER ----------------
  const fetchCrashMultiplier = async () => {
    try {
      const response = await axios.get('https://crash-game-sse3.onrender.com/api/bet/crash');
      const data = response.data;
      const point = data?.crashPoint ?? data?.crashMultiplier ?? data?.crash ?? null;
      if (point !== null && point !== undefined) {
        setMultiplierData(prevData => {
          const newData = [...prevData, parseFloat(point)];
          return newData.slice(-20);
        });
      }
    } catch (error) {
      console.error('Error fetching crash multiplier:', error);
    }
  };

  useEffect(() => {
    fetchCrashMultiplier();
    const interval = setInterval(fetchCrashMultiplier, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---------------- FETCH LIVE USERS ----------------
  const fetchLiveUsers = async () => {
    try {
      const response = await axios.get("https://crash-game-sse3.onrender.com/api/live-users");
      if (response.data) setLiveUsers(response.data);
    } catch (err) {
      console.error("Error fetching live users:", err);
    }
  };

  useEffect(() => {
    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 5000);
    return () => clearInterval(interval);
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
            <a href="#" className="hover:text-orange-500">NEED ASSISTANCE?</a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 flex-1 justify-center sm:justify-end text-sm sm:text-base">
            <span className="bg-gray-600 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-center">
              KSH {availableBalance}
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
          {/* Menu Button (☰) */}
          <button
            className="text-white text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Assistance + Balance centered */}
          <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
            <p className="text-xs text-gray-300">Need Assistance?</p>
            <span className="px-3 py-1 bg-gray-700 rounded-md text-white font-semibold">
              KSH {availableBalance}
            </span>
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
                <button onClick={handleDeposit} className="px-4 py-3 hover:bg-gray-700 text-left">Deposit</button>
                <button onClick={handleWithdraw} className="px-4 py-3 hover:bg-gray-700 text-left">Withdraw</button>
                <button onClick={handleLogOut} className="px-4 py-3 hover:bg-gray-700 text-left">Log Out</button>
              </div>
            </div>
          )}

      </header>


      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto pt-28 pb-12 px-4 sm:px-8">
        <div className="flex flex-col lg:flex-row justify-between w-full max-w-7xl mx-auto space-y-6 lg:space-y-0 lg:space-x-6">
          {/* Crash Game */}
          <div className="w-full lg:w-2/3 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl text-center mb-4">Crash Game Multiplier</h2>
            <CrashGame showControls={true}/>
          </div>

          {/* Live Users */}
          <div className="w-full lg:w-1/3 bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-4">Live Users</h2>
            <div className="space-y-2">
              <div className="flex justify-between font-semibold text-sm sm:text-base">
                <div>User</div>
                <div>Amount</div>
                <div>Profit</div>
              </div>
              {liveUsers.map((user, index) => (
                <div key={index} className="flex justify-between text-xs sm:text-sm">
                  <div>{user.user}</div>
                  <div className={user.amount === '-' ? "text-red-500" : ""}>
                    {user.amount}
                  </div>
                  <div className={user.profit === '-' ? "text-red-500" : "text-green-500"}>
                    {user.profit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 🔥 Transaction Messages */}
      <TransactionMessages />

      {/* Footer */}
      <footer className="bg-orange-500 text-center py-2 sm:py-4 mt-6">
        <p className="text-white text-sm sm:text-base">SPECIAL HAPPY HOUR DEAL!</p>
        <p className="text-white text-xs sm:text-sm">PATA 10% YA LOSSES ZAKO ALL WEEK BETWEEN 8AM - 10AM</p>
      </footer>

      {/* Withdraw Popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-11/12 sm:w-2/3 md:w-1/3 space-y-4">
            <h3 className="text-xl sm:text-2xl font-semibold text-center">Withholding Tax Notice</h3>
            <p>
              As provided for by the Income Tax Act, Cap 472, all gaming companies are required to
              withhold winnings at a rate of 20%. Pakakumi will deduct and remit 20% of all winnings to KRA.
            </p>
            <div className="space-y-2">
              <input type="number" className="p-2 rounded bg-gray-800 text-white w-full border border-gray-500"
                value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter withdrawal amount" />
              {withdrawAmount < 300 && withdrawAmount !== '' && (
                <p className="text-red-500 text-sm">Minimum withdrawal is KES 300</p>
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
            <div className="space-y-4">
              <div className="flex flex-col">
                <label>Phone Number</label>
                <input type="text" className="p-2 rounded bg-gray-800 text-white w-full border border-gray-500"
                  value={depositPhone} onChange={(e) => setDepositPhone(e.target.value)} placeholder="Enter phone number (07XXXXXXXX)" />
              </div>
              <div className="flex flex-col">
                <label>Amount (KES)</label>
                <input type="number" className="p-2 rounded bg-gray-800 text-white w-full border border-gray-500"
                  value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Enter deposit amount" />
                {depositAmount < 50 && depositAmount !== '' && (
                  <p className="text-red-500 text-sm">Minimum deposit is KES 50</p>
                )}
              </div>
            </div>
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
            <div className="flex justify-between mt-4 space-x-2">
              <button onClick={closeDepositPopup} className="bg-red-600 py-2 px-4 rounded-lg w-1/2">CLOSE</button>
              <button onClick={confirmDeposit} disabled={isDepositProcessing}
                className={`bg-blue-600 py-2 px-4 rounded-lg w-1/2 ${isDepositProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
                {isDepositProcessing ? "Processing..." : "DEPOSIT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 🔥 Transaction messages component
const TransactionMessages = () => {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const fadeInTimer = useRef(null);
  const fadeOutTimer = useRef(null);
  const intervalRef = useRef(null);

  const randomId = () => "TI" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const randomAmount = () => {
    const roll = Math.random();
    if (roll < 0.7) return Math.random() * (5000 - 3000) + 3000;
    if (roll < 0.8) return Math.random() * (40000 - 20000) + 20000;
    return Math.random() * (15000 - 6000) + 6000;
  };

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getFormattedDate = () => {
    const now = new Date();
    if (Math.random() < 0.5) return now.toLocaleDateString("en-GB");
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toLocaleDateString("en-GB");
  };

  const randomTime = () => {
    const now = new Date();
    const pastHours = 1 + Math.floor(Math.random() * 2);
    now.setHours(now.getHours() - pastHours);
    return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  useEffect(() => {
    const showOne = () => {
      const amountVal = randomAmount();
      const msg = `${randomId()} Confirmed. You have received Ksh${fmt(
        amountVal
      )} from MONEY GRAPH on ${getFormattedDate()} at ${randomTime()}. Separate personal and business funds through Pochi la Biashara on *334#`;

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
    <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 w-[90%] sm:w-[500px] z-[9999]">
      <div
        className={`text-xs sm:text-sm px-4 py-2 bg-green-600 rounded-lg shadow-md text-center transition-all duration-700 ease-out
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
};

export default Homepage;
