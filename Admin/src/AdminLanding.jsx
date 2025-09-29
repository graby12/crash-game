import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminLanding = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch("https://crash-game-sse3.onrender.com/admins/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials! Please try again.");
      }

      // store token returned from server
      localStorage.setItem("adminAuthToken", data.token);
      setIsLoggedIn(true);
      navigate("/admin/dashboard");
    } catch (error) {
      alert(error.message || "Login failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthToken");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex flex-col">
      {/* Main Section */}
      <div className="flex-1 flex items-center justify-center px-4">
        {!isLoggedIn ? (
          <div className="bg-white w-full max-w-sm p-6 sm:p-8 rounded-lg shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-orange-500">
              MoneyGraph Admin Login
            </h2>
            <input
              type="email"
              placeholder="Enter your email"
              className="block w-full px-4 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter your password"
              className="block w-full px-4 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            >
              Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
              Welcome, Admin
            </h2>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="w-full max-w-xs px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4 transition"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full max-w-xs px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4 text-center text-sm">
        <p>&copy; MoneyGraph 2025. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AdminLanding;
