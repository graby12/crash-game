// CrashGame.jsx
import React, { useState, useEffect } from "react";
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
  const [availableBalance, setAvailableBalance] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [betAmount, setBetAmount] = useState(100);
  const [useAutoCashout, setUseAutoCashout] = useState(false);
  const [autoCashout, setAutoCashout] = useState(2);
  const [result, setResult] = useState(null);
  const [multiplierData, setMultiplierData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [showCrash, setShowCrash] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);

  // Errors
  const [betError, setBetError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const isLoggedIn = Boolean(localStorage.getItem("token"));

  // --- Auto-clear errors after 3s ---
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

  // --- Fetch live users ---
  const fetchLiveUsers = async () => {
    try {
      const res = await fetch("https://crash-game-sse3.onrender.com/api/live-users");
      const data = await res.json();
      setLiveUsers(data);
    } catch (err) {
      console.error("Error fetching live users:", err);
    }
  };

  // --- Start round ---
  const startRound = async () => {
    try {
      const res = await fetch("https://crash-game-sse3.onrender.com/api/crash");
      const data = await res.json();
      setCrashPoint(data.crashMultiplier);
      fetchLiveUsers();

      setMultiplier(0);
      setMultiplierData([0]);
      setTimeData([0]);
      setRunning(true);
      setCashedOut(false);
      setResult(null);
      setWaitingForStart(false);
    } catch (err) {
      console.error("Error fetching crash:", err);
    }
  };

  // --- Place bet ---
  const handlePlaceBet = async () => {
    setBetError("");
    setGeneralError("");

    if (countdown === null) {
      setGeneralError("❌ You can only place bets during countdown before game starts!");
      return;
    }

    if (betAmount < 100) {
      setBetError("❌ Minimum bet is 100");
      setBetAmount(100);
      return;
    }

    if (betAmount > availableBalance) {
      setBetError("❌ Insufficient balance!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://crash-game-sse3.onrender.com/api/bet/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: betAmount,
          ...(useAutoCashout ? { autoCashOut: autoCashout } : {}),
        }),
      });

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

  // --- Withdraw ---
  const handleWithdraw = async () => {
    if (running && betPlaced && !cashedOut) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("https://crash-game-sse3.onrender.com/api/bet/withdraw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ multiplier, betAmount }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to cash out");

        setAvailableBalance(data.newBalance);
        setResult({ type: "win", amount: data.payout });
        setCashedOut(true);
        setRunning(false);
        setHistory([`${multiplier.toFixed(2)}x`, ...history.slice(0, 6)]);
        triggerCountdown();
      } catch (err) {
        console.error("Error withdrawing:", err);
        setGeneralError("❌ Withdraw failed: " + err.message);
      }
    }
  };

  // --- Countdown ---
  const triggerCountdown = () => setCountdown(5.0);

  useEffect(() => {
    if (countdown !== null) {
      if (countdown <= 0) {
        setCountdown(null);
        setWaitingForStart(false);
        startRound();
        return;
      }
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev - 0.1).toFixed(1));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // --- Multiplier animation ---
  useEffect(() => {
    let animationFrame;
    let startTime;

    if (running && crashPoint) {
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000;

        const growthRate = 0.18;
        const current = Math.exp(growthRate * elapsed);

        if (current >= crashPoint) {
          setMultiplier(crashPoint);
          setMultiplierData((prev) => [...prev, crashPoint]);
          setTimeData((prev) => [...prev, elapsed]);

          if (betPlaced) {
            if (useAutoCashout && autoCashout <= crashPoint) {
              const win = (betAmount * autoCashout).toFixed(2);
              setResult({ type: "win", amount: win });
            } else if (!cashedOut) {
              setResult({ type: "lose", amount: betAmount });
            }
          }

          setRunning(false);
          setShowCrash(crashPoint.toFixed(2));
          setHistory([`${crashPoint.toFixed(2)}x`, ...history.slice(0, 6)]);

          setTimeout(() => {
            setShowCrash(null);
            triggerCountdown();
          }, 5000);
          return;
        }

        setMultiplier(current);
        setMultiplierData((prev) => [...prev, current]);
        setTimeData((prev) => [...prev, elapsed]);

        if (betPlaced && useAutoCashout && current >= autoCashout && !cashedOut) {
          const win = (betAmount * autoCashout).toFixed(2);
          setResult({ type: "win", amount: win });
          setCashedOut(true);
          setRunning(false);
          setHistory([`${autoCashout.toFixed(2)}x`, ...history.slice(0, 6)]);
          triggerCountdown();
          return;
        }

        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [running, crashPoint, useAutoCashout, autoCashout, cashedOut, betPlaced, betAmount, history]);

  // --- Auto start ---
  useEffect(() => {
    if (!running && countdown === null) {
      triggerCountdown();
    }
  }, [running, countdown]);

  // --- Chart data ---
  const data = {
    datasets: [
      {
        label: "Multiplier",
        data: timeData.map((t, i) => ({ x: t, y: multiplierData[i] })),
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
        ticks: { color: "white", stepSize: 3 },
        grid: { color: "rgba(255,255,255,0.15)" },
        min: 0,
        suggestedMax: 12,
      },
      y: {
        min: 1,
        ticks: {
          color: "white",
          callback: (value) => (value % 1 === 0 ? value + "x" : ""),
        },
        grid: { color: "rgba(255,255,255,0.15)" },
        suggestedMax: Math.ceil(multiplier) + 1,
      },
    },
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-4 w-full text-white">
      {/* Chart */}
      <div className="relative w-full bg-black p-2 rounded shadow h-64 sm:h-80 md:h-[28rem] flex items-center justify-center">
        <Line data={data} options={options} />

        {running && multiplier >= 1 && !cashedOut && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-white pointer-events-none">
            {multiplier.toFixed(2)}x
          </div>
        )}

        {showCrash && (
          <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-extrabold text-red-500 animate-pulse pointer-events-none">
            💥 {showCrash}x
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold text-yellow-400 pointer-events-none">
            Next round in: {countdown}s
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
                <div className="flex flex-col">
                  <label className="block text-xs">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(100, Number(e.target.value)))}
                    className="border p-1 rounded w-28 sm:w-28 md:w-32 text-center text-black"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs">Auto Cash Out (x)</label>
                  <input
                    type="number"
                    min={2}
                    value={autoCashout}
                    onChange={(e) => setAutoCashout(Math.max(2, Number(e.target.value)))}
                    disabled={!useAutoCashout}
                    className={`border p-1 rounded w-24 sm:w-24 md:w-28 text-center ${
                      useAutoCashout ? "text-black" : "bg-gray-300 text-gray-500"
                    }`}
                  />
                </div>

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
                      running && betPlaced && !cashedOut ? handleWithdraw : handlePlaceBet
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

            <div className="flex flex-col items-center text-center">
              {betError && (
                <p className="text-red-400 text-xs font-bold mt-1 animate-fadeout">
                  {betError}
                </p>
              )}
              {generalError && (
                <p className="text-red-400 text-xs font-bold mt-1 animate-fadeout">
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
      <div className="flex space-x-1 flex-wrap justify-center">
        {history.map((h, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded text-xs font-bold ${
              parseFloat(h) < 2
                ? "bg-red-200 text-red-700"
                : "bg-green-200 text-green-700"
            }`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Live Users */}
      <div className="w-full bg-gray-900 rounded p-2 mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-2">🔥 Live Users</h3>
        <div className="min-w-full">
          {liveUsers.map((u, i) => (
            <div
              key={i}
              className="flex justify-between text-xs border-b border-gray-700 py-1 min-w-[300px]"
            >
              <span className="truncate max-w-[80px]">{u.user}</span>
              <span className="truncate max-w-[80px]">
                {u.amount === "-" ? "-" : `KES ${u.amount}`}
              </span>
              <span className="truncate max-w-[60px]">{u.multiplier}</span>
              <span
                className={
                  u.profit === "-"
                    ? "text-red-500 font-bold truncate max-w-[80px]"
                    : "text-green-500 font-bold truncate max-w-[80px]"
                }
              >
                {u.profit === "-" ? "-" : `KES ${u.profit}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
