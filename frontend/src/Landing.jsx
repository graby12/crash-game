// App.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CrashGame from "./CrashGame.jsx";

const App = () => {
  const navigate = useNavigate();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Player stats
  const [playersOnline, setPlayersOnline] = useState(440);
  const [playersRegistered, setPlayersRegistered] = useState(2340);
  const [playersPlaying, setPlayersPlaying] = useState(250);

  // Update players stats
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayersOnline(Math.floor(Math.random() * (800 - 400 + 1)) + 400);
      setPlayersPlaying(Math.floor(Math.random() * (400 - 200 + 1)) + 200);
    }, 10000);

    const twoHours = 2 * 60 * 60 * 1000;
    const regInterval = setInterval(() => {
      setPlayersRegistered(
        (prev) => prev + Math.floor(Math.random() * (8 - 3 + 1)) + 3
      );
    }, twoHours);

    return () => {
      clearInterval(interval);
      clearInterval(regInterval);
    };
  }, []);

 // LOGIN
const handleLogin = async () => {
  setError("");
  setSuccess("");
  const userData = { phoneNumber, password };

  try {
    const response = await fetch(
      "https://crash-game-sse3.onrender.com/api/register/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }
    );

    const data = await response.json();

    if (response.ok) {
      // ✅ Save token
      localStorage.setItem("token", data.token);

      // ✅ Save user details
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("phoneNumber", data.user.phoneNumber);
      localStorage.setItem("balance", data.user.balance);
      localStorage.setItem("userCode", data.user.userCode); // unique MGxxxx

      setSuccess("Logged in successfully");
      handleCloseModal();
      navigate("/home");
    } else {
      setError(data.error || "Login failed");
    }
  } catch {
    setError("Something went wrong. Please try again later.");
  }
};

// REGISTER (no OTP)
const handleRegister = async () => {
  setError("");
  setSuccess("");

  if (username.length < 5) {
    setError("Username must be at least 5 characters long");
    return;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
    setError("Password must be 6+ chars with letters & numbers");
    return;
  }
  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  const userData = { username, phoneNumber, password };

  try {
    const response = await fetch(
      "https://crash-game-sse3.onrender.com/api/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }
    );

    const data = await response.json();

    if (response.ok) {
      // If backend returns user with userCode, you can save it here:
      if (data.user) {
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("phoneNumber", data.user.phoneNumber);
        localStorage.setItem("balance", data.user.balance);
        localStorage.setItem("userCode", data.user.userCode);
      }

      setSuccess("Registration successful! You can now log in.");
      setIsLogin(true);
      setPassword("");
      setConfirmPassword("");
    } else {
      setError(data.error || "Registration failed");
    }
  } catch {
    setError("Something went wrong. Please try again later.");
  }
};

  // Modal control
  const handleOpenModal = (loginMode) => {
    setIsLogin(loginMode);
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center sm:justify-between p-4 border-b border-gray-700 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">MONEY GRAPH</h1>
        <div className="flex gap-3">
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400"
            onClick={() => handleOpenModal(true)}
          >
            LOGIN
          </button>
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400"
            onClick={() => handleOpenModal(false)}
          >
            REGISTER
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <button
              onClick={handleCloseModal}
              className="absolute right-3 top-3 text-white/80 hover:text-white"
            >
              ✖
            </button>

            <h2 className="text-xl font-semibold mb-4">
              {isLogin ? "Log Into Money Graph" : "Sign Up Instantly"}
            </h2>

            {!isLogin && (
              <div className="mb-2">
                <label className="block text-gray-300 mb-1 text-sm">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            {/* Phone number */}
            <div className="mb-2">
              <label className="block text-gray-300 mb-1 text-sm">
                Phone number
              </label>
              <input
                type="text"
                placeholder="Enter phone number"
                className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label className="block text-gray-300 mb-1 text-sm">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="mb-2">
                <label className="block text-gray-300 mb-1 text-sm">
                  Re-enter Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="mt-4">
              {isLogin ? (
                <button
                  className="w-full py-2 bg-blue-500 text-white rounded-md text-sm"
                  onClick={handleLogin}
                >
                  LOGIN
                </button>
              ) : (
                <button
                  className="w-full py-2 bg-blue-500 text-white rounded-md text-sm"
                  onClick={handleRegister}
                >
                  JOIN MONEY GRAPH
                </button>
              )}
            </div>

            <div className="mt-3 text-center text-sm">
              {isLogin ? (
                <p>
                  Don’t have an account?{" "}
                  <button
                    className="text-orange-400 hover:underline"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    className="text-orange-400 hover:underline"
                    onClick={() => setIsLogin(true)}
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-col flex-1 p-4 gap-6">
        {/* Crash Graph */}
        <div className="flex flex-col items-center w-full mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">
            Join now and multiply Asap
          </h2>
          <div className="w-full min-h-[260px]">
            <CrashGame showControls={false} />
          </div>

          {/* Player Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center w-full">
            <div className="bg-gray-700 bg-opacity-60 rounded-xl p-4 shadow-md">
              <p className="text-sm text-gray-300 uppercase">Players Online</p>
              <p className="text-3xl font-bold text-green-400">
                {playersOnline}
              </p>
            </div>
            <div className="bg-gray-700 bg-opacity-60 rounded-xl p-4 shadow-md">
              <p className="text-sm text-gray-300 uppercase">
                Players Registered
              </p>
              <p className="text-3xl font-bold text-white">
                {playersRegistered.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700 bg-opacity-60 rounded-xl p-4 shadow-md">
              <p className="text-sm text-gray-300 uppercase">Players Playing</p>
              <p className="text-3xl font-bold text-orange-400">
                {playersPlaying}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="w-full flex flex-col">
          <TransactionMessages />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 p-4 mt-6 text-center text-sm text-white">
        © {new Date().getFullYear()} Money Graph. All Rights Reserved.
      </footer>
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

export default App;