import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';


// Register Chart.js components and annotation plugin
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

const GameDashboard = () => {
  const navigate = useNavigate(); // Hook to navigate to other routes

  const [multiplierData, setMultiplierData] = useState([1.25]);
  const [currentTime, setCurrentTime] = useState(20);
  const [multiplier, setMultiplier] = useState(1.25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const chartRef = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Added username state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [liveUsers, setLiveUsers] = useState([]);

const fetchLiveUsers = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5000/api/live-users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data) setLiveUsers(res.data);
  } catch (err) {
    console.error("Error fetching live users:", err);
  }
};

// Auto-refresh every 5 seconds
useEffect(() => {
  fetchLiveUsers();
  const interval = setInterval(fetchLiveUsers, 5000);
  return () => clearInterval(interval);
}, []);


  // Handle login functionality
  const handleLogin = async () => {
    const userData = { phoneNumber, password };

    try {
      const response = await fetch('http://localhost:5000/api/register/login', {  // Use the correct login endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

            if (response.ok) {
        localStorage.setItem("token", data.token); // Save token
        setSuccess("Logged in successfully");
        setIsModalOpen(false);
        navigate("/home");
      }else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    }
  };

  // Register user function (sending data to backend)
  const handleRegister = async () => {
    const userData = { username, phoneNumber, password };

    // Front-end validation for username
    if (username.length < 5) {
      setError('Username must be at least 5 characters long');
      return;
    }

    // Front-end validation for password
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
      setError('Password must contain at least one letter and one number');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Registration successful! You can now log in.');
        setIsLogin(true); // Switch to login view after registration
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    }
  };

  // Forgot Password logic
  const handleForgotPassword = () => {
    setIsForgotPassword(true);
  };

  const handleSendVerificationCode = () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }
    // Here you should send the phone number to your backend to send the verification code.
    setSuccess('Verification code sent!');
  };

  const handleVerificationCodeSubmit = () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    // Here you should validate the code with your backend.
    setSuccess('Password reset successful!');
  };

  // Chart data and options
  const data = {
    labels: Array.from({ length: multiplierData.length }, (_, i) => i.toString()),
    datasets: [
      {
        label: 'Multiplier Progress',
        data: multiplierData,
        borderColor: '#FF5733',
        backgroundColor: 'rgba(255, 87, 51, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      annotation: {
        annotations: {
          multiplierLabel: {
            type: 'label',
            xValue: Math.floor(multiplierData.length / 2),
            yValue: multiplier,
            backgroundColor: 'rgba(255, 87, 51, 0.8)',
            font: {
              size: 16,
              weight: 'bold',
            },
            color: 'white',
            content: `${multiplier.toFixed(2)}x`,
            padding: 5,
            cornerRadius: 5,
            offsetX: 10,
            offsetY: -10,
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (seconds)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Multiplier',
        },
        beginAtZero: true,
        max: 10,
      },
    },
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 0) {
        setCurrentTime((prevTime) => prevTime - 1);
      } else {
        setCurrentTime(20);
        setMultiplier(1.25);
      }

      if (currentTime === 0) {
        setMultiplier((prevMultiplier) => prevMultiplier + (Math.random() * 0.2));
      }

      setMultiplierData((prevData) => [...prevData, multiplier]);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTime, multiplier]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleLogOut = () => {
    navigate('/'); // Redirect to the GameDashboard page
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <header className="flex justify-between p-4 border-b border-gray-700">
        <h1 className="text-3xl font-bold">MONEY GRAPH</h1>
        <div>
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400 mx-2"
            onClick={() => { setIsLogin(true); toggleModal(); }}
          >
            LOGIN
          </button>
          <button
            className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400"
            onClick={() => { setIsLogin(false); toggleModal(); }}
          >
            REGISTER
          </button>
        </div>
      </header>

      {/* Modal for Login/Register */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">{isLogin ? 'Log Into Money Graph' : 'Sign Up Instantly'}</h2>
              <button className="text-white" onClick={closeModal}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Username field for Register */}
            {!isLogin && (
              <div className="mt-4">
                <label className="block text-white mb-2">Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  className="w-full px-4 py-2 mb-4 rounded-md bg-gray-700 text-white focus:outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {username && username.length < 5 && (
                  <p className="text-red-500 text-sm mt-1">Username must be at least 5 characters long</p>
                )}
              </div>
            )}

            {/* Phone number field */}
            <div className="mt-4">
              <label className="block text-white mb-2">Phone number</label>
              <input
                type="text"
                placeholder="Enter phone number"
                className="w-full px-4 py-2 mb-4 rounded-md bg-gray-700 text-white focus:outline-none"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-white mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-4 py-2 mb-4 rounded-md bg-gray-700 text-white focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)}
            </div>

            <button className="w-full py-2 bg-blue-500 text-white rounded-md" onClick={isLogin ? handleLogin : handleRegister}>
              {isLogin ? 'LOGIN' : 'JOIN MONEY GRAPH'}
            </button>

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {success && <p className="text-green-500 text-center mt-4">{success}</p>}

            <p className="text-center text-sm text-white mt-4">
              {isLogin ? '' : 'By signing up, you agree to the Terms of Service.'}
            </p>

            <p className="text-center text-sm text-white mt-2">
              {isLogin
                ? "Don't have an account? Sign up now"
                : 'Already have an account? Log in'}
            </p>
            {isLogin && (
              <p className="text-blue-500 text-center mt-4 cursor-pointer" onClick={handleForgotPassword}>
                Forgot Password?
              </p>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotPassword && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Forgot Password</h2>
              <button className="text-white" onClick={() => setIsForgotPassword(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-white mb-2">Phone number</label>
              <input
                type="text"
                placeholder="Enter your phone number"
                className="w-full px-4 py-2 mb-4 rounded-md bg-gray-700 text-white focus:outline-none"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <button
                className="w-full py-2 bg-blue-500 text-white rounded-md"
                onClick={handleSendVerificationCode}
              >
                Send Verification Code
              </button>
              {error && <p className="text-red-500 text-center mt-4">{error}</p>}
              {success && <p className="text-green-500 text-center mt-4">{success}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-white mb-2">Verification Code</label>
              <input
                type="text"
                placeholder="Enter verification code"
                className="w-full px-4 py-2 mb-4 rounded-md bg-gray-700 text-white focus:outline-none"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <button
                className="w-full py-2 bg-blue-500 text-white rounded-md"
                onClick={handleVerificationCodeSubmit}
              >
                Submit Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col sm:flex-row sm:justify-between p-4">
        {/* Graph and Timer */}
        <div className="flex flex-col items-center w-full sm:w-1/2 mb-6 sm:mb-0">
          <div className="text-4xl sm:text-5xl font-bold mb-6">
            Next Round In: <span className="text-blue-500">{currentTime}s</span>
          </div>

          <div className="w-full sm:h-80 mb-6">
            <Line ref={chartRef} data={data} options={options} />
          </div>

          <div className="text-xl font-semibold">
            Current Multiplier: <span className="text-yellow-500">{multiplier.toFixed(2)}x</span>
          </div>
        </div>

        {/* Live Users Section */}
        <div className="w-full sm:w-1/2 flex flex-col">
          <div className="text-center mb-4">
            <p className="text-lg">Login or Register to start playing.</p>
          </div>

          <div className="overflow-y-auto h-96 mb-6">
            <table className="w-full table-auto mb-6">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Profit</th>
                </tr>
              </thead>
              {liveUsers.length > 0 ? (
                  liveUsers.map((player, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="px-4 py-2">{player.user}</td>
                      <td className="px-4 py-2">{player.amount}</td>
                      <td className="px-4 py-2">{player.profit}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-gray-400">
                      No live users yet
                    </td>
                  </tr>
                )}

            </table>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <div className="flex justify-between text-center">
              <div className="flex-1 mx-2">
                <p className="text-lg font-semibold text-orange-500">Players Online</p>
                <p className="text-xl text-white">440</p>
              </div>
              <div className="flex-1 mx-2">
                <p className="text-lg font-semibold text-orange-500">Players Playing</p>
                <p className="text-xl text-white">127</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gray-800 p-4 mt-6">
        <div className="text-center text-white">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Money Graph. All Rights Reserved.
          </p>
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

export default GameDashboard;
