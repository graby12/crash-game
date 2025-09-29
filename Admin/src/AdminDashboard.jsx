import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaBars } from "react-icons/fa";
import { io } from "socket.io-client";

const AdminDashboard = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dailyNewUsers, setDailyNewUsers] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [viewMode, setViewMode] = useState("today"); // ✅ toggle between today / all

  // 🔹 Crash game states
  const [crashResults, setCrashResults] = useState([]);
  const [upcomingCrash, setUpcomingCrash] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminAuthToken");
    navigate("/");
  };

  const totalBalance = 53200;

  // 🔹 Fetch users once
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(
          "https://crash-game-sse3.onrender.com/api/admin"
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch users API: ${res.status}`);
        }
        const data = await res.json();
        console.log("Fetched /api/admin data:", data);

        setAllUsers(data);
        setTotalUsers(data.length);

        // ✅ Uganda/Kenya timezone (EAT, UTC+3)
        const todayLocal = new Date().toLocaleDateString("en-CA", {
          timeZone: "Africa/Kampala",
        });

        const newToday = data.filter((user) => {
          const timestamp = user.createdAt || user.date || user.registeredAt;
          if (!timestamp) return false;
          const userDate = new Date(timestamp).toLocaleDateString("en-CA", {
            timeZone: "Africa/Kampala",
          });
          return userDate === todayLocal;
        }).length;

        setDailyNewUsers(newToday);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  // 🔹 Real-time crash game events
  useEffect(() => {
    const socket = io("https://crash-game-sse3.onrender.com/admin", {
      transports: ["websocket"],
    });

    // Upcoming crash point (before round starts)
    socket.on("upcomingCrashResult", (data) => {
      setUpcomingCrash(data.crashPoint);
    });

    // Round ended
    socket.on("roundEnded", (data) => {
      setCrashResults((prev) => [
        {
          multiplier: data.crashPoint + "x",
          time: new Date().toLocaleString("en-GB", {
            timeZone: "Africa/Kampala",
          }),
        },
        ...prev,
      ]);
      setUpcomingCrash(null); // reset preview after round ends
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ filter users depending on view mode
  const displayedUsers = allUsers.filter((user) => {
    if (viewMode === "all") return true;

    const timestamp = user.createdAt || user.date || user.registeredAt;
    if (!timestamp) return false;

    const todayLocal = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Kampala",
    });

    const userDate = new Date(timestamp).toLocaleDateString("en-CA", {
      timeZone: "Africa/Kampala",
    });

    return userDate === todayLocal;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-full md:h-screen w-64 bg-gray-800 text-white transform transition-transform duration-200 z-40 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 bg-gray-900 flex justify-between items-center md:block">
          <h2 className="text-2xl font-bold">Money Graph</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-white"
          >
            ✕
          </button>
        </div>
        <nav className="flex-grow space-y-4 mt-4 px-4">
          <button
            onClick={() => {
              setActiveTab("users");
              setIsSidebarOpen(false);
            }}
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "users" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => {
              setActiveTab("crash-results");
              setIsSidebarOpen(false);
            }}
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "crash-results" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            Crash Game Results
          </button>
          <button
            onClick={() => {
              setActiveTab("balance");
              setIsSidebarOpen(false);
            }}
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "balance" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            Balance
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-md py-3 px-4 md:px-6 border-b flex justify-between items-center relative">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-700"
            >
              <FaBars size={22} />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-orange-500">
              Money Graph
            </h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <FaUserCircle size={24} />
              <span className="hidden sm:inline">Admin</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-50">
                <ul className="py-2">
                  <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-6 flex-grow bg-gray-100">
          {activeTab === "users" && (
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4">
                Users Overview
              </h3>
              <p>
                Total Users:{" "}
                <span className="font-semibold">{totalUsers}</span>
              </p>
              <p>
                New Signups Today:{" "}
                <span className="font-semibold">{dailyNewUsers}</span>
              </p>

              {/* Toggle buttons */}
              <div className="flex space-x-2 mt-4 mb-4">
                <button
                  onClick={() => setViewMode("today")}
                  className={`px-4 py-2 rounded ${
                    viewMode === "today"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Today’s Users
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-4 py-2 rounded ${
                    viewMode === "all"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  All Users
                </button>
              </div>

              {/* Users Table */}
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full bg-white border rounded shadow">
                  <thead className="bg-gray-200 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Phone Number</th>
                      <th className="px-4 py-2 text-left">Balance</th>
                      <th className="px-4 py-2 text-left">Date Joined</th>
                      <th className="px-4 py-2 text-left">Time Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUsers.map((user, idx) => {
                      const ts =
                        user.createdAt ||
                        user.date ||
                        user.registeredAt ||
                        new Date();

                      const localDate = new Date(ts).toLocaleDateString(
                        "en-GB",
                        { timeZone: "Africa/Kampala" }
                      );
                      const localTime = new Date(ts).toLocaleTimeString(
                        "en-GB",
                        { timeZone: "Africa/Kampala" }
                      );

                      return (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-4 py-2">
                            {user.username || "Unknown"}
                          </td>
                          <td className="px-4 py-2">
                            {user.phoneNumber || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-green-600 font-semibold">
                            {user.balance ?? 0}
                          </td>
                          <td className="px-4 py-2">{localDate}</td>
                          <td className="px-4 py-2">{localTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "crash-results" && (
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4">
                Crash Game Results
              </h3>

              {/* Upcoming crash preview */}
              {upcomingCrash && (
                <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500">
                  Upcoming Crash Point:{" "}
                  <b>{parseFloat(upcomingCrash).toFixed(2)}x</b>
                </div>
              )}

              {/* Past results */}
              <ul className="space-y-2">
                {crashResults.map((result, idx) => (
                  <li
                    key={idx}
                    className="p-3 bg-white shadow rounded flex flex-col sm:flex-row sm:justify-between"
                  >
                    <span>Multiplier: {result.multiplier}</span>
                    <span className="text-gray-600 text-sm sm:text-base">
                      {result.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "balance" && (
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4">
                Customer Deposits
              </h3>
              <p>
                Total Balance:{" "}
                <span className="font-semibold text-green-600">
                  ${totalBalance.toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
