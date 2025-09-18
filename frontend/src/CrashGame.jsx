// CrashGame.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import io from "socket.io-client";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

export default function CrashGame({ showControls = true }) {
  const socketRef = useRef(null);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  const [cashedOut, setCashedOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [betAmount, setBetAmount] = useState(0);
  const [useAutoCashout, setUseAutoCashout] = useState(false);
  const [autoCashout, setAutoCashout] = useState("");
  const [result, setResult] = useState(null);
  const [chartData, setChartData] = useState([{ x: 0, y: 1 }]);
  const [countdown, setCountdown] = useState(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [showCrash, setShowCrash] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);

  // Errors
  const [betError, setBetError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const isLoggedIn = Boolean(localStorage.getItem("token"));

  // keep runningRef in sync (used inside socket callbacks)
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Auto-clear errors
  useEffect(() => {
    if (betError) {
      const t = setTimeout(() => setBetError(""), 3000);
      return () => clearTimeout(t);
    }
  }, [betError]);
  useEffect(() => {
    if (generalError) {
      const t = setTimeout(() => setGeneralError(""), 3000);
      return () => clearTimeout(t);
    }
  }, [generalError]);

  // ---- SOCKET.IO EVENTS ----
  useEffect(() => {
    // Wake server before opening socket (helps on platforms that sleep)
    fetch("https://crash-game-sse3.onrender.com/").catch(() =>
      console.warn("Wake-up ping failed")
    );

    socketRef.current = io("https://crash-game-sse3.onrender.com", {
      transports: ["websocket", "polling"], // fallback allowed
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🟢 Connected to WebSocket");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    // COUNTDOWN: show countdown, reset UI/graph so graph doesn't run while countdown is visible
    socket.on("countdown", (time) => {
      setCountdown(time);
      setRunning(false); // ensure graph is paused
      setMultiplier(1);
      setChartData([{ x: 0, y: 1 }]); // reset data
      setShowCrash(null); // clear any previous crash overlay
      setResult(null);
      setCashedOut(false);
    });

    // ROUND STARTED: hide countdown, start the graph, reset data
    socket.on("roundStarted", ({ crashPoint }) => {
      setCountdown(null); // hide "Next round in"
      setCrashPoint(crashPoint);
      setRunning(true);
      setMultiplier(1);
      setChartData([{ x: 0, y: 1 }]); // fresh dataset for this round
      setWaitingForStart(false);
      // NOTE: keep betPlaced as-is (user may have an active bet)
    });

    // MULTIPLIER UPDATES (during running)
    socket.on("multiplierUpdate", ({ multiplier: newMultiplier, elapsed }) => {
      setMultiplier(newMultiplier);
      // append to chart data — don't rely on `running` closure (server only emits when running),
      // but we still check runningRef defensively
      setChartData((prev) => {
        // if for some reason we're not running, avoid appending
        if (!runningRef.current) return prev;
        // avoid duplicate identical points
        const last = prev[prev.length - 1];
        if (last && last.x === elapsed && last.y === newMultiplier) return prev;
        return [...prev, { x: elapsed, y: newMultiplier }];
      });
    });

    // ROUND ENDED: stop graph, show crash overlay, update history
    socket.on("roundEnded", ({ crashPoint: cp, history }) => {
      setRunning(false);
      setShowCrash(cp);
      setHistory(history.slice(-20));
      setBetPlaced(false); // reset placed bet for next round
      setWaitingForStart(false);
    });

    // balance updates for logged-in user
    socket.on("balanceUpdated", ({ userId, newBalance }) => {
      const myId = localStorage.getItem("userId");
      if (userId === myId) {
        setAvailableBalance(newBalance);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ---- Fetch live users ----
  const fetchLiveUsers = async () => {
    try {
      const res = await fetch(
        "https://crash-game-sse3.onrender.com/api/live-users"
      );
      const data = await res.json();
      setLiveUsers(data);
    } catch (err) {
      console.error("Error fetching live users:", err);
    }
  };
  useEffect(() => {
    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---- Place bet ----
  const handlePlaceBet = async () => {
    setBetError("");
    setGeneralError("");

    // bets only allowed while countdown is active (server behavior)
    if (countdown === null) {
      setGeneralError("❌ You can only place bets during countdown!");
      return;
    }

    if (!betAmount || betAmount < 10) {
      setBetError("❌ Minimum bet is 10");
      return;
    }

    if (betAmount > availableBalance) {
      setBetError("❌ Insufficient balance!");
      return;
    }

    if (useAutoCashout && autoCashout) {
      const valid = /^\d+(\.\d{1,2})?$/.test(autoCashout);
      if (!valid) {
        setBetError("❌ Auto cashout must have up to two decimals");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "https://crash-game-sse3.onrender.com/api/bet/bet",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: betAmount,
            ...(useAutoCashout && autoCashout
              ? { autoCashOut: parseFloat(Number(autoCashout).toFixed(2)) }
              : {}),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place bet");

      setAvailableBalance(data.newBalance);
      setBetPlaced(true);
      setWaitingForStart(true);
    } catch (err) {
      console.error("Error placing bet:", err);
      setGeneralError("❌ Bet failed: " + err.message);
    }
  };

  // ---- Withdraw ----
  const handleWithdraw = async () => {
    if (running && betPlaced && !cashedOut) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          "https://crash-game-sse3.onrender.com/api/bet/withdraw",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ multiplier, betAmount }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to cash out");

        setAvailableBalance(data.newBalance);
        setResult({ type: "win", amount: data.payout });
        setCashedOut(true);
        setRunning(false);
      } catch (err) {
        console.error("Error withdrawing:", err);
        setGeneralError("❌ Withdraw failed: " + err.message);
      }
    }
  };

  // Chart data for react-chartjs-2
  const data = {
    datasets: [
      {
        label: "Multiplier",
        data: chartData,
        borderColor: showCrash ? "#FF0000" : "#FF5733",
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (s)" },
        ticks: { color: "white", stepSize: 1 },
        grid: { color: "rgba(255,255,255,0.15)" },
        min: 0,
        suggestedMax: 15,
      },
      y: {
        min: 1,
        ticks: {
          color: "white",
          callback: (value) => value + "x",
        },
        grid: { color: "rgba(255,255,255,0.15)" },
        suggestedMax: Math.ceil(multiplier) + 1,
      },
    },
  };

  // Auto cashout helpers
  const handleAutoCashoutChange = (e) => {
    const v = e.target.value;
    if (v === "") return setAutoCashout("");
    if (/^\d*(?:\.\d{0,2})?$/.test(v)) {
      setAutoCashout(v);
    }
  };
  const handleAutoCashoutBlur = () => {
    if (!autoCashout) return;
    setAutoCashout(parseFloat(autoCashout).toFixed(2));
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-4 w-full text-white">
      {/* Chart */}
      <div className="relative w-full bg-black p-2 rounded shadow h-64 sm:h-80 md:h-[28rem] flex items-center justify-center">
        <Line data={data} options={options} />

        {/* Priority: countdown -> running multiplier -> crash overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold text-yellow-400 pointer-events-none">
            Next round in: {typeof countdown === "number" ? countdown.toFixed(1) : countdown}s
          </div>
        )}

        {!countdown && running && multiplier >= 1 && !cashedOut && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-white pointer-events-none">
            {multiplier.toFixed(2)}x
          </div>
        )}

        {!countdown && !running && showCrash && (
          <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-extrabold text-red-500 animate-pulse pointer-events-none">
            💥 {showCrash}x
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`text-2xl sm:text-3xl md:text-4xl font-extrabold animate-fadeout ${
            result.type === "win" ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.type === "win"
            ? `🎉 Congratulations! You won KES ${result.amount}`
            : `💥 Oops! You lost KES ${result.amount}`}
        </div>
      )}

      {/* Bet Controls */}
      {showControls &&
        (isLoggedIn ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-end justify-between w-full max-w-3xl">
              <div className="w-24 hidden sm:block" />
              <div className="flex items-end gap-4 mx-auto flex-wrap sm:flex-nowrap justify-center">
                {/* Bet Amount */}
                <div className="flex flex-col">
                  <label className="block text-xs">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount || ""}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="border p-1 rounded w-28 sm:w-28 md:w-32 text-center text-black"
                    placeholder="Enter amount"
                    min={10}
                  />
                </div>

                {/* Auto Cash Out */}
                <div className="flex flex-col">
                  <label className="block text-xs">Auto Cash Out (x)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={autoCashout}
                    onChange={handleAutoCashoutChange}
                    onBlur={handleAutoCashoutBlur}
                    disabled={!useAutoCashout}
                    className={`border p-1 rounded w-24 sm:w-24 md:w-28 text-center ${
                      useAutoCashout ? "text-black" : "bg-gray-300 text-gray-500"
                    }`}
                  />
                </div>

                {/* Place Bet / Withdraw */}
                <div className="flex flex-col">
                  <button
                    className={`px-4 py-2 rounded-lg text-white font-semibold text-sm ${
                      waitingForStart
                        ? "bg-gray-600 cursor-not-allowed"
                        : running && betPlaced && !cashedOut
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={
                      running && betPlaced && !cashedOut
                        ? handleWithdraw
                        : handlePlaceBet
                    }
                    disabled={waitingForStart || (running && cashedOut)}
                  >
                    {waitingForStart
                      ? "Waiting..."
                      : running && betPlaced && !cashedOut
                      ? "Withdraw"
                      : "Place Bet"}
                  </button>
                </div>
              </div>

              {/* Toggle Auto */}
              <label className="flex flex-col items-center cursor-pointer select-none">
                <span className="text-xs mb-1">Auto</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={useAutoCashout}
                    onChange={() => setUseAutoCashout(!useAutoCashout)}
                  />
                  <div className="block w-10 h-5 bg-gray-400 rounded-full" />
                  <div
                    className={`absolute left-1 top-0.5 w-4 h-4 rounded-full transition ${
                      useAutoCashout ? "translate-x-5 bg-blue-500" : "bg-white"
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Messages */}
            <div className="flex flex-col items-center text-center mt-2 min-h-[20px]">
              {betError && (
                <p className="text-red-400 text-xs font-bold animate-fadeout">
                  {betError}
                </p>
              )}
              {generalError && (
                <p className="text-red-400 text-xs font-bold animate-fadeout">
                  {generalError}
                </p>
              )}
              {waitingForStart && (
                <p className="text-green-400 text-sm font-bold animate-fadeout">
                  ✅ Bet placed, waiting for game to start...
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm">
            Log in to place bets and cash out.
          </p>
        ))}

      {/* History */}
     

      {/* Live Users */}
      <div className="w-full bg-gray-900 rounded p-2 mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-2">Live Users</h3>
        <div className="min-w-[320px]">
          <div className="grid grid-cols-4 text-xs font-bold border-b border-gray-700 pb-1 mb-1">
            <span>User</span>
            <span>Bet</span>
            <span>Multiplier</span>
            <span>Profit</span>
          </div>
          {liveUsers.map((u, i) => (
            <div
              key={i}
              className="grid grid-cols-4 text-xs border-b border-gray-800 py-0.5"
            >
              <span className="truncate max-w-[80px]">{u.user}</span>
              <span className="truncate max-w-[80px]">
                {u.amount === "-" ? "-" : `KES ${u.amount}`}
              </span>
              <span className="truncate max-w-[60px]">{u.multiplier}</span>
              <span
                className={
                  u.profit === "-" || u.profit === "0"
                    ? "text-red-500 font-bold truncate max-w-[80px]"
                    : "text-green-500 font-bold truncate max-w-[80px]"
                }
              >
                {u.profit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
