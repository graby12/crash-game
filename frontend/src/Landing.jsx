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
        <h1 className="text-2xl sm:text-3xl font-bold w-full sm:w-auto text-center sm:text-left">MONEY GRAPH</h1>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3">
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400 w-full sm:w-auto"
            onClick={() => handleOpenModal(true)}
          >
            LOGIN
          </button>
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400 w-full sm:w-auto"
            onClick={() => handleOpenModal(false)}
          >
            REGISTER
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-md sm:max-w-lg">
            {/* Close button */}
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
              <div className="mt-2 text-sm">
                <label className="block text-gray-300 mb-1 text-sm">Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  className="w-full px-3 py-2 mb-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            {/* Phone + OTP */}
            <div className="mt-3 text-sm">
              <label className="block text-gray-300 mb-1 text-sm">Phone number</label>
              <div className={`flex ${!isLogin ? "gap-2" : ""} flex-col sm:flex-row`}>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className="flex-1 px-3 py-2 mb-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                {!isLogin && (
                  <button
                    className={`px-2 py-2 mb-2 rounded-md text-xs ${otpButtonDisabled ? "bg-gray-500" : "bg-blue-500"} text-white w-full sm:w-auto`}
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
                        className="w-12 h-12 sm:w-10 sm:h-10 text-center text-lg rounded bg-gray-700 text-white"
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
            <div className="mt-3 text-sm">
              <label className="block text-gray-300 mb-1 text-sm">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-3 py-2 mb-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div className="mt-2 text-sm">
                <label className="block text-gray-300 mb-1 text-sm">Re-enter Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 mb-2 rounded-md bg-gray-700 text-white focus:outline-none text-sm"
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

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-2">{success}</p>}

            {/* Toggle */}
            <p className="text-center text-xs text-white mt-3 cursor-pointer">
              {isLogin ? (
                <>
                  Don’t have an account?{" "}
                  <span
                    className="text-orange-400 hover:underline"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up now
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span
                    className="text-orange-400 hover:underline"
                    onClick={() => setIsLogin(true)}
                  >
                    Log in
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-col sm:flex-row flex-1 p-4 gap-6">
        {/* Left */}
        <div className="flex flex-col items-center w-full sm:w-1/2 mb-6 sm:mb-0">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center sm:text-left">Join now and multiply Asap</h2>
          <div className="w-full min-h-[260px]">
            <CrashGame showControls={false} />
          </div>
        </div>

        {/* Right */}
        <div className="w-full sm:w-1/2 flex flex-col">
          <div className="text-center mb-4">
            <p className="text-lg">Login or Register to start playing.</p>
          </div>

          {/* Transaction messages */}
          <TransactionMessages />

          <div className="overflow-x-auto mb-6">
            <div className="overflow-y-auto h-72">
              <table className="w-full table-auto min-w-[600px] mb-6">
                <thead>
                  <tr className="bg-gray-800 text-left">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {liveUsers.length > 0 ? (
                    liveUsers.map((player, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="px-4 py-2">{player.user}</td>
                        <td
                          className={
                            player.amount === "-"
                              ? "px-4 py-2 text-red-500"
                              : "px-4 py-2 text-white"
                          }
                        >
                          {player.amount === "-" ? "-" : `Ksh ${player.amount}`}
                        </td>
                        <td
                          className={
                            player.profit === "-"
                              ? "px-4 py-2 text-red-500 font-semibold"
                              : "px-4 py-2 text-green-500 font-semibold"
                          }
                        >
                          {player.profit === "-" ? "-" : `Ksh ${player.profit}`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-gray-400">
                        No live users yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <div className="flex flex-col sm:flex-row justify-between text-center gap-4">
              <div className="flex-1">
                <p className="text-lg font-semibold text-orange-500">Players Online</p>
                <p className="text-xl text-white">440</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-orange-500">Players Registered</p>
                <p className="text-xl text-white">2,340</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 p-4 mt-6">
        <div className="text-center text-white">
          <p className="text-sm">&copy; {new Date().getFullYear()} Money Graph. All Rights Reserved.</p>
          <p className="text-sm">
            <a href="/terms-of-service" className="text-orange-500 hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

// 🔥 Random transaction messages component
const TransactionMessages = () => {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  // refs for timers so we can clean up
  const fadeInTimer = useRef(null);
  const fadeOutTimer = useRef(null);
  const intervalRef = useRef(null);

  const randomId = () =>
    "TI" + Math.random().toString(36).substring(2, 10).toUpperCase();

  // ✅ Weighted random amount generator
  const randomAmount = () => {
    const roll = Math.random(); // 0..1

    if (roll < 0.7) {
      // 70% chance → 3000 - 5000
      return Math.random() * (5000 - 3000) + 3000;
    } else if (roll < 0.8) {
      // next 10% → 20000 - 40000
      return Math.random() * (40000 - 20000) + 20000;
    } else {
      // remaining 20% → 6000 - 15000
      return Math.random() * (15000 - 6000) + 6000;
    }
  };

  // format with commas and 2 decimals
  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const randomTime = () => {
    const hours = Math.floor(Math.random() * 12) + 1;
    const minutes = String(Math.floor(Math.random() * 60)).padStart(2, "0");
    const ampm = Math.random() > 0.5 ? "AM" : "PM";
    return `${hours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const showOne = () => {
      // generate amount
      const amountVal = randomAmount();
      // ensure balance > amount: add a random extra (100..50,000)
      const extra = Math.random() * (50000 - 100) + 100;
      const balanceVal = amountVal + extra;

      const amountStr = fmt(amountVal);
      const balanceStr = fmt(balanceVal);

      const msg = `${randomId()} Confirmed. You have received Ksh${amountStr} from MONEY GRAPH on 9/9/25 at ${randomTime()}. New M-PESA balance is Ksh${balanceStr}. Separate personal and business funds through Pochi la Biashara on *334#`;

      // set new message and run fade in/out cycle
      setMessage(msg);
      setVisible(false);

      // clear any previous timers
      if (fadeInTimer.current) clearTimeout(fadeInTimer.current);
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);

      // small delay so the transition can animate (fade in)
      fadeInTimer.current = setTimeout(() => setVisible(true), 100);
      // hold visible for ~5s then fade out
      fadeOutTimer.current = setTimeout(() => setVisible(false), 5000);
    };

    // show immediately, then every 7s
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

export default App;
