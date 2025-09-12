// App.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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

  // OTP
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpButtonDisabled, setOtpButtonDisabled] = useState(false);
  const [otpNoticeVisible, setOtpNoticeVisible] = useState(false);
  const otpInputsRef = useRef([]);

  // Live users
  const [liveUsers, setLiveUsers] = useState([]);

  // Player stats
  const [playersOnline, setPlayersOnline] = useState(440);
  const [playersRegistered, setPlayersRegistered] = useState(2340);
  const [playersPlaying, setPlayersPlaying] = useState(250);

  // Fetch live users
  const fetchLiveUsers = async () => {
    try {
      const res = await axios.get("https://crash-game-sse3.onrender.com/api/live-users");
      if (res.data) setLiveUsers(res.data);
    } catch (err) {
      console.error("Error fetching live users:", err);
    }
  };

  useEffect(() => {
    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update players stats
  useEffect(() => {
    // Online + Playing → update every 10s
    const interval = setInterval(() => {
      setPlayersOnline(Math.floor(Math.random() * (800 - 400 + 1)) + 400);
      setPlayersPlaying(Math.floor(Math.random() * (400 - 200 + 1)) + 200);
    }, 10000);

    // Registered → increase every 2h
    const twoHours = 2 * 60 * 60 * 1000;
    const regInterval = setInterval(() => {
      setPlayersRegistered((prev) => prev + Math.floor(Math.random() * (8 - 3 + 1)) + 3);
    }, twoHours);

    return () => {
      clearInterval(interval);
      clearInterval(regInterval);
    };
  }, []);

  // Send OTP
  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError("Enter phone number first");
      return;
    }
    try {
      await axios.post("https://crash-game-sse3.onrender.com/api/register/send-otp", { phoneNumber });
      setOtpSent(true);
      setOtpButtonDisabled(true);
      setOtpNoticeVisible(true);
      setSuccess("OTP sent");
      setTimeout(() => {
        if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
      }, 50);
    } catch {
      setError("Failed to send OTP");
    }
  };

  // OTP handling
  const handleOtpChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 3) {
      if (otpInputsRef.current[index + 1]) otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      if (otpInputsRef.current[index - 1]) otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
    if (paste.length) {
      const arr = paste.split("");
      const filled = [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
      setOtp(filled);
    }
    e.preventDefault();
  };

  // LOGIN
  const handleLogin = async () => {
    setError("");
    setSuccess("");
    const userData = { phoneNumber, password };
    try {
      const response = await fetch("https://crash-game-sse3.onrender.com/api/register/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
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

  // REGISTER
  const handleRegister = async () => {
    setError("");
    setSuccess("");
    if (username.length < 5) {
      setError("Username must be at least 5 characters long");
      return;
    }
    if (!otpSent) {
      setError("Please send OTP first");
      return;
    }
    if (otp.join("").length !== 4) {
      setError("Enter the 4-digit OTP sent to your phone");
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

    const userData = { username, phoneNumber, password, otp: otp.join("") };
    try {
      const response = await fetch("https://crash-game-sse3.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Registration successful! You can now log in.");
        setIsLogin(true);
        setOtp(["", "", "", ""]);
        setOtpSent(false);
        setOtpButtonDisabled(false);
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
    setOtp(["", "", "", ""]);
    setOtpSent(false);
    setOtpButtonDisabled(false);
    setOtpNoticeVisible(false);
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

      {/* Username for Register */}
      {!isLogin && (
        <div className="mb-2">
          <label className="block text-gray-300 mb-1 text-sm">Username</label>
          <input
            type="text"
            placeholder="Enter username"
            className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      )}

      {/* Phone + OTP */}
      <div className="mb-2">
        <label className="block text-gray-300 mb-1 text-sm">Phone number</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter phone number"
            className="flex-1 px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          {!isLogin && (
            <button
              className={`px-2 py-2 rounded-md text-xs ${
                otpButtonDisabled ? "bg-gray-500" : "bg-blue-500"
              } text-white`}
              onClick={handleSendOtp}
              disabled={otpButtonDisabled}
            >
              {otpButtonDisabled ? "Sent" : "Send OTP"}
            </button>
          )}
        </div>

        {!isLogin && otpSent && (
          <div className="mt-2">
            {otpNoticeVisible && (
              <p className="text-green-400 text-xs mb-2">OTP sent</p>
            )}
            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="w-10 h-10 text-center text-lg rounded bg-gray-700 text-white"
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="mb-2">
        <label className="block text-gray-300 mb-1 text-sm">Password</label>
        <input
          type="password"
          placeholder="Enter password"
          className="w-full px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {/* Confirm Password */}
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

      {/* Toggle login/register */}
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
      <main className="flex flex-col sm:flex-row flex-1 p-4 gap-6">
        {/* Left */}
        <div className="flex flex-col items-center w-full sm:w-1/2 mb-6 sm:mb-0">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center sm:text-left">
            Join now and multiply Asap
          </h2>
          <div className="w-full min-h-[260px]">
            <CrashGame showControls={false} />
          </div>
        </div>

        {/* Right */}
        <div className="w-full sm:w-1/2 flex flex-col">
          <TransactionMessages />

          {/* Stats */}
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <div className="flex flex-col sm:flex-row justify-between text-center gap-4">
              <div className="flex-1">
                <p className="text-lg font-semibold text-orange-500">Players Online</p>
                <p className="text-xl text-white">{playersOnline}</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-orange-500">Players Registered</p>
                <p className="text-xl text-white">{playersRegistered.toLocaleString()}</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-orange-500">Players Playing</p>
                <p className="text-xl text-white">{playersPlaying}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 p-4 mt-6 text-center text-sm text-white">
        © {new Date().getFullYear()} Money Graph. All Rights Reserved.
      </footer>
    </div>
  );
};

// 🔥 Transaction messages
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
      const extra = Math.random() * (50000 - 100) + 100;
      const balanceVal = amountVal + extra;
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
  <div className="h-24 relative mb-4">
    <div
      className={`absolute inset-0 flex items-center justify-center text-xs sm:text-sm px-4 py-2 bg-green-600 rounded-lg shadow-md transition-opacity duration-2000 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  </div>
);
};

// ✅ close function FIRST, then export
export default App;

