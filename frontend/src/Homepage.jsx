import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import io from 'socket.io-client';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SOCKET_URL = "http://localhost:5000"; // replace with ngrok URL in production

const HomePage = () => {
  const navigate = useNavigate();

  // ---------------- STATES ----------------
  const [betAmount, setBetAmount] = useState('');
  const [autoCashOut, setAutoCashOut] = useState(2);
  const [liveUsers, setLiveUsers] = useState([
    { user: 'Myles13', amount: 3000, profit: 150 },
    { user: 'Saito999', amount: 999, profit: 50 },
    { user: 'Support', amount: 150, profit: 10 },
    { user: 'New29055', amount: 100, profit: 5 },
    { user: 'Kkipchumba', amount: 40, profit: 3 },
  ]);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [multiplierData, setMultiplierData] = useState([1.5, 2.0, 2.5, 3.0, 3.67, 4.1]);

  // Withdraw states
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Deposit states
  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [isDepositProcessing, setIsDepositProcessing] = useState(false);

  // ---------------- FETCH USER BALANCE ----------------
  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("http://localhost:5000/api/balance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.balance !== undefined) {
        setAvailableBalance(res.data.balance);
      }
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

    // Live STK push updates
    socket.on("depositSuccess", (data) => {
      const decoded = jwtDecode(localStorage.getItem("token"));
      if (data.userId === decoded.userId) {
        setAvailableBalance(data.balance);
        setSuccessMessage(`Deposit of ${data.amount} successful!`);
      }
    });

    // Live balance updates (bets or other)
    socket.on("balanceUpdated", (data) => {
      const decoded = jwtDecode(localStorage.getItem("token"));
      if (data.userId === decoded.userId) {
        setAvailableBalance(data.newBalance);
      }
    });

    return () => socket.disconnect();
  }, []);

  // ---------------- FETCH CRASH MULTIPLIER ----------------
  const fetchCrashMultiplier = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bet/crash');
      const data = response.data;
      setMultiplierData(prevData => {
        const newData = [...prevData, parseFloat(data.crashPoint)];
        return newData.slice(-20);
      });
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
      const response = await axios.get("http://localhost:5000/api/live-users");
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
    if (parseFloat(betAmount) < 10) { setErrorMessage("Minimum staking is KES 10"); return; }
    if (parseFloat(betAmount) > availableBalance) { setErrorMessage("Insufficient balance"); return; }
    setErrorMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/bet/place-bet", {
        amount: parseFloat(betAmount),
        autoCashOut: parseFloat(autoCashOut)
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

      if (res.data) {
        setAvailableBalance(res.data.balance);
        setSuccessMessage("Bet placed successfully! Redirecting to crash game...");
        await fetchUserBalance();
        setTimeout(() => navigate("/crash-game"), 2000);
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
      const res = await axios.post("http://localhost:5000/api/bet/withdraw", {
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

      const res = await axios.post("http://localhost:5000/api/deposit", {
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

  // ----------------- GRAPH DATA -----------------
  const graphLabels = multiplierData.map((_, i) => `${i * 5}s`);
  const graphData = {
    labels: graphLabels,
    datasets: [{
      label: 'Crash Game Multiplier',
      data: multiplierData,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1,
      fill: false
    }]
  };

  // ----------------- AUTO-CASHOUT EFFECT -----------------
  useEffect(() => {
    if (!betAmount || !autoCashOut) return;
    const lastMultiplier = multiplierData[multiplierData.length - 1];
    if (lastMultiplier >= autoCashOut) {
      setSuccessMessage(`Auto-cashed out at ${autoCashOut}x!`);
      setAvailableBalance(prev => prev + parseFloat(betAmount) * parseFloat(autoCashOut));
      setBetAmount('');
    }
  }, [multiplierData]);

  // ----------------- RENDER -----------------
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <header className="flex items-center p-4 bg-gray-800">
        <div className="text-xl font-bold w-1/3">MONEY GRAPH</div>
        <div className="flex space-x-4 text-white w-1/3 justify-center">
          <a href="#" className="hover:text-orange-500" onClick={handleWithdraw}>WITHDRAW</a>
          <a href="#" className="hover:text-orange-500" onClick={handleDeposit}>DEPOSIT</a>
          <a href="#" className="hover:text-orange-500">NEED ASSISTANCE?</a>
        </div>
        <div className="flex items-center space-x-4 text-white w-1/3 justify-end">
          <span className="bg-gray-600 text-white px-4 py-2 rounded-lg">KSH {availableBalance}</span>
          <span>KKK5249201</span>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500" onClick={handleLogOut}>
            LOG OUT
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-col items-center space-y-8 p-8">
        {/* Chart + Bet + Live Users */}
        <div className="flex flex-col sm:flex-row justify-between w-full max-w-7xl p-6 space-x-6">
          {/* Chart */}
          <div className="w-full sm:w-1/3 bg-gray-800 p-6 rounded-lg shadow-md mb-6 sm:mb-0">
            <h2 className="text-2xl text-center mb-4">Crash Game Multiplier</h2>
            <Line data={graphData} />
          </div>

          {/* Bet Panel */}
          <div className="w-full sm:w-1/3 bg-gray-700 p-6 rounded-lg shadow-md mb-6 sm:mb-0">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex flex-col space-y-2 w-1/2">
                  <label>Bet Amount (KES)</label>
                  <input type="number" className="p-2 rounded bg-gray-800 text-white"
                    value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="Enter bet amount" />
                  {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
                  {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
                </div>
                <div className="flex flex-col space-y-2 w-1/2">
                  <label>Auto Cashout (X)</label>
                  <input type="number" className="p-2 rounded bg-gray-800 text-white" value={autoCashOut} onChange={(e) => setAutoCashOut(e.target.value)} />
                </div>
              </div>
              <button className="bg-blue-600 text-white py-2 px-4 rounded w-full mt-4" onClick={handleBet}>BET</button>
            </div>
          </div>

          {/* Live Users */}
          <div className="w-full sm:w-1/3 bg-gray-700 p-6 rounded-lg shadow-md mb-6 sm:mb-0">
            <h2 className="text-xl font-semibold text-center mb-4">Live Users</h2>
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <div>User</div>
                <div>Amount</div>
                <div>Profit</div>
              </div>
              {liveUsers.map((user, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>{user.user}</div>
                  <div>{user.amount}</div>
                  <div>{user.profit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center w-full p-4 bg-gray-800">
          <div className="text-sm">
            For assistance, contact us at{' '}
            <a href="tel:0743999333" className="text-orange-500">0743999333</a>
          </div>
          <div className="mt-4 w-full bg-orange-500 text-black py-4 text-center">
            <p className="text-white">SPECIAL HAPPY HOUR DEAL!</p>
            <p className="text-white">PATA 10% YA LOSSES ZAKO ALL WEEK BETWEEN 8AM - 10AM</p>
          </div>
        </footer>
      </main>

      {/* Withdraw Popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg w-1/3 space-y-4">
            <h3 className="text-2xl font-semibold text-center text-white">Withholding Tax Notice</h3>
            <p className="text-white">
              As provided for by the Income Tax Act, Cap 472, all gaming companies are required to
              withhold winnings at a rate of 20%. Pakakumi will deduct and remit 20% of all winnings to KRA.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-white">
                <span>Amount (KES)</span>
                <input type="number" className="p-2 rounded bg-gray-800 text-white w-full mt-2 border border-gray-500"
                  value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter withdrawal amount" />
              </div>
              {withdrawAmount < 300 && withdrawAmount !== '' && (
                <p className="text-red-500 text-sm mt-2">Minimum withdrawal is KES 300</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-white">
                <span>Withholding Tax</span>
                <span>{-(withdrawAmount * 0.2)}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Withdraw Fee</span>
                <span>-16</span>
              </div>
              <div className="flex justify-between font-bold text-white">
                <span>Disbursed Amount</span>
                <span>{withdrawAmount - withdrawAmount * 0.2 - 16}</span>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={closePopup} className="bg-red-600 text-white py-2 px-4 rounded-lg w-1/2">CLOSE</button>
              <button onClick={confirmWithdraw} className="bg-blue-600 text-white py-2 px-4 rounded-lg w-1/2">WITHDRAW</button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Popup */}
      {isDepositPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg w-1/3 space-y-4">
            <h3 className="text-2xl font-semibold text-center text-white">Deposit Funds</h3>
            <div className="space-y-4">
              <div className="flex flex-col text-white">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="p-2 rounded bg-gray-800 text-white w-full mt-2 border border-gray-500"
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(e.target.value)}
                  placeholder="Enter phone number (07XXXXXXXX)"
                />
              </div>
              <div className="flex flex-col text-white">
                <label>Amount (KES)</label>
                <input
                  type="number"
                  className="p-2 rounded bg-gray-800 text-white w-full mt-2 border border-gray-500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter deposit amount"
                />
                {depositAmount < 50 && depositAmount !== '' && (
                  <p className="text-red-500 text-sm mt-2">Minimum deposit is KES 50</p>
                )}
              </div>
            </div>
            {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
            <div className="flex justify-between mt-4">
              <button
                onClick={closeDepositPopup}
                className="bg-red-600 text-white py-2 px-4 rounded-lg w-1/2"
                disabled={isDepositProcessing}
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeposit}
                className={`py-2 px-4 rounded-lg w-1/2 ${isDepositProcessing ? 'bg-gray-600' : 'bg-blue-600 text-white'}`}
                disabled={isDepositProcessing}
              >
                {isDepositProcessing ? 'Processing...' : 'DEPOSIT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
