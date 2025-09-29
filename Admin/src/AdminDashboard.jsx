import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaBars } from "react-icons/fa";

const AdminDashboard = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dailyNewUsers, setDailyNewUsers] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminAuthToken");
    navigate("/");
  };

  const crashResults = [
    { id: 1, multiplier: "2.4x", time: "2025-09-28 14:30" },
    { id: 2, multiplier: "1.7x", time: "2025-09-28 14:35" },
    { id: 3, multiplier: "5.2x", time: "2025-09-28 14:40" },
  ];
  const totalBalance = 53200;

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
          timeZone: "Africa/Kampala", // same as Nairobi
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

              {/* Users List */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Recent Users</h4>
                <ul className="space-y-1 max-h-60 overflow-y-auto bg-white p-2 rounded shadow">
                  {allUsers.slice(0, 10).map((user, idx) => {
                    const ts =
                      user.createdAt ||
                      user.date ||
                      user.registeredAt ||
                      "Unknown date";
                    return (
                      <li
                        key={idx}
                        className="text-sm border-b last:border-0 py-1"
                      >
                        <span className="font-medium">
                          {user.username || "Unknown"}
                        </span>{" "}
                        — {user.phoneNumber || "No phone"} — Balance:{" "}
                        <span className="text-green-600 font-semibold">
                          {user.balance ?? 0}
                        </span>{" "}
                        — {new Date(ts).toLocaleString("en-GB", {
                          timeZone: "Africa/Kampala",
                        })}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "crash-results" && (
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4">
                Crash Game Results
              </h3>
              <ul className="space-y-2">
                {crashResults.map((result) => (
                  <li
                    key={result.id}
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
