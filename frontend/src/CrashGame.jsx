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
  const runningRef = useRef(false);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning] = useState(false);
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
  const [betError, setBetError] = useState("");
  const [generalError, setGeneralError] = useState("");

 const usernamePool = [
  "OkelloJay","OkelloKen","OkelloSusa",
  "NalukwagoRay","NalukwagoLyn","NalukwagoMara",
  "NamuliTimo","NamuliZara","NamuliLeo",
  "KatoBea","KatoKris","KatoNia",
  "AkelloMax","AkelloSol","AkelloDee",
  "MugerwaVic","MugerwaRia","MugerwaZee",
  "NabiryeSam","NabiryeBen","NabiryeKai",
  "OcenIvy","OcenNoa","OcenEve",
  "NakatoUma","NakatoJax","NakatoAmi",
  "SsebunyaRio","SsebunyaAda","SsebunyaGus",
  "NabwireJay","NabwireKen","NabwireSusa",
  "OkothRay","OkothLyn","OkothMara",
  "NamagandaTimo","NamagandaZara","NamagandaLeo",
  "WasswaBea","WasswaKris","WasswaNia",
  "NajjembaMax","NajjembaSol","NajjembaDee",
  "KaggwaVic","KaggwaRia","KaggwaZee",
  "NamboozeSam","NamboozeBen","NamboozeKai",
  "OryemIvy","OryemNoa","OryemEve",
  "NansubugaUma","NansubugaJax","NansubugaAmi",
  "LwangaRio","LwangaAda","LwangaGus",
  "MukasaJay","MukasaKen","MukasaSusa",
  "NamirembeRay","NamirembeLyn","NamirembeMara",
  "SsemandaTimo","SsemandaZara","SsemandaLeo",
  "NakayizaBea","NakayizaKris","NakayizaNia",
  "OkumuMax","OkumuSol","OkumuDee",
  "NankundaVic","NankundaRia","NankundaZee",
  "LubegaSam","LubegaBen","LubegaKai",
  "NamwanjeIvy","NamwanjeNoa","NamwanjeEve",
  "KigoziUma","KigoziJax","KigoziAmi",
  "NakalembeRio","NakalembeAda","NakalembeGus",
  "SsemakulaJay","SsemakulaKen","SsemakulaSusa",
  "NabatanziRay","NabatanziLyn","NabatanziMara",
  "OjokTimo","OjokZara","OjokLeo",
  "NansikombiBea","NansikombiKris","NansikombiNia",
  "MukisaMax","MukisaSol","MukisaDee",
  "NabunyaVic","NabunyaRia","NabunyaZee",
  "OtienoSam","OtienoBen","OtienoKai",
  "NamulemeIvy","NamulemeNoa","NamulemeEve",
  "LumuUma","LumuJax","LumuAmi",
  "NamatovuRio","NamatovuAda","NamatovuGus",
  "MutebiJay","MutebiKen","MutebiSusa",
  "NanyongaRay","NanyongaLyn","NanyongaMara",
  "OchanTimo","OchanZara","OchanLeo",
  "NamusokeBea","NamusokeKris","NamusokeNia",
  "KiyingiMax","KiyingiSol","KiyingiDee",
  "NajjeraVic","NajjeraRia","NajjeraZee",
  "OkidiSam","OkidiBen","OkidiKai",
  "NanyonjoIvy","NanyonjoNoa","NanyonjoEve",
  "LuleUma","LuleJax","LuleAmi",
  "NabiryoRio","NabiryoAda","NabiryoGus",
  "SseguyaJay","SseguyaKen","SseguyaSusa",
  "NamukasaRay","NamukasaLyn","NamukasaMara",
  "OcholaTimo","OcholaZara","OcholaLeo",
  "NambiroBea","NambiroKris","NambiroNia",
  "KyambaddeMax","KyambaddeSol","KyambaddeDee",
  "OtimVic","OtimRia","OtimZee",
  "NantongoSam","NantongoBen","NantongoKai",
  "KawooyaIvy","KawooyaNoa","KawooyaEve",
  "NakibuuleUma","NakibuuleJax","NakibuuleAmi",
  "SsenfumaRio","SsenfumaAda","SsenfumaGus",
  "OgwangJay","OgwangKen","OgwangSusa",
  "NanyanziRay","NanyanziLyn","NanyanziMara",
  "LutaayaTimo","LutaayaZara","LutaayaLeo",
  "NassoloBea","NassoloKris","NassoloNia",
  "MuwongeMax","MuwongeSol","MuwongeDee",
  "NanzalaVic","NanzalaRia","NanzalaZee",
  "OdurSam","OdurBen","OdurKai",
  "NakawundeIvy","NakawundeNoa","NakawundeEve",
  "KayanjaUma","KayanjaJax","KayanjaAmi",
  "OloyaRio","OloyaAda","OloyaGus",
  "NamukisaJay","NamukisaKen","NamukisaSusa",
  "KalemaRay","KalemaLyn","KalemaMara",
  "NamuyanjaTimo","NamuyanjaZara","NamuyanjaLeo",
  "SserunkuumaBea","SserunkuumaKris","SserunkuumaNia",
  "OnyangoMax","OnyangoSol","OnyangoDee",
  "MugishaVic","MugishaRia","MugishaZee",
  "NalubegaSam","NalubegaBen","NalubegaKai",
  "OpioIvy","OpioNoa","OpioEve",
  "MukalaziUma","MukalaziJax","MukalaziAmi",
  "SemakulaRio","SemakulaAda","SemakulaGus",
  "KabandaJay","KabandaKen","KabandaSusa",
  "KiggunduRay","KiggunduLyn","KiggunduMara",
  "OdongoTimo","OdongoZara","OdongoLeo",
  "NabukaluBea","NabukaluKris","NabukaluNia",
  "KisakyeMax","KisakyeSol","KisakyeDee",
  "MatovuVic","MatovuRia","MatovuZee",
  "NakatuddeSam","NakatuddeBen","NakatuddeKai",
  "KasuleIvy","KasuleNoa","KasuleEve",
  "MuwangaUma","MuwangaJax","MuwangaAmi",
  "LubwamaRio","LubwamaAda","LubwamaGus",
  "NakyejweJay","NakyejweKen","NakyejweSusa",
  "OboteRay","OboteLyn","OboteMara",
  "KavumaTimo","KavumaZara","KavumaLeo",
  "OlumBea","OlumKris","OlumNia",
  "MugaluMax","MugaluSol","MugaluDee",
  "KasoziVic","KasoziRia","KasoziZee",
  "NamwangaSam","NamwangaBen","NamwangaKai",
  "KibuukaIvy","KibuukaNoa","KibuukaEve",
  "KyeyuneUma","KyeyuneJax","KyeyuneAmi",
  "SsematimbaRio","SsematimbaAda","SsematimbaGus"
];


  const isLoggedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

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
    fetch("https://crash-game-sse3.onrender.com/").catch(() =>
      console.warn("Wake-up ping failed")
    );

    socketRef.current = io("https://crash-game-sse3.onrender.com", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => console.log("🟢 Connected to WebSocket"));
    socket.on("connect_error", (err) => console.error("❌ Socket error:", err));

    socket.on("countdown", (time) => {
      setCountdown(time);
      setRunning(false);
      setMultiplier(1);
      setChartData([{ x: 0, y: 1 }]);
      setShowCrash(null);
      setResult(null);
      setCashedOut(false);
      setLiveUsers([]);
    });

    socket.on("roundStarted", ({ crashPoint }) => {
      setCountdown(null);
      setCrashPoint(crashPoint);
      setRunning(true);
      setMultiplier(1);
      setChartData([{ x: 0, y: 1 }]);
      setWaitingForStart(false);

      const totalUsers = Math.floor(Math.random() * 19) + 12; // 12-30 users
      let users = [];
      for (let i = 0; i < totalUsers; i++) {
        const name = usernamePool[Math.floor(Math.random() * usernamePool.length)];
        const amount = randomAmountUGX();
        const target = parseFloat(
          (Math.random() * (Math.min(crashPoint, 10) - 1.1) + 1.1).toFixed(2)
        );
        users.push({
          user: name,
          amount,
          target,
          multiplier: "-",
          profit: "-",
          cashedOut: false,
        });
      }

      // 45-75% will win
      const winRate = Math.random() * 0.3 + 0.45;
      const winnersCount = Math.floor(users.length * winRate);
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const winners = new Set(shuffled.slice(0, winnersCount).map((u) => u.user));

      users = users.map((u) => ({ ...u, willWin: winners.has(u.user) }));
      setLiveUsers(users);
    });

    socket.on("multiplierUpdate", ({ multiplier: newMultiplier, elapsed }) => {
      setMultiplier(newMultiplier);
      setChartData((prev) => {
        if (!runningRef.current) return prev;
        const last = prev[prev.length - 1];
        if (last && last.x === elapsed && last.y === newMultiplier) return prev;
        return [...prev, { x: elapsed, y: newMultiplier }];
      });

      setLiveUsers((prev) =>
        prev.map((u) => {
          if (!u.willWin || u.cashedOut || u.profit !== "-") return u;
          if (newMultiplier >= u.target) {
            return {
              ...u,
              multiplier: u.target,
              profit: Math.floor(u.amount * (u.target - 1)),
              cashedOut: true,
            };
          }
          return u;
        })
      );
    });

    socket.on("roundEnded", ({ crashPoint: cp, history }) => {
      setRunning(false);
      setShowCrash(cp);
      setHistory(history.slice(-20));
      setBetPlaced(false);
      setWaitingForStart(false);

      setLiveUsers((prev) =>
        prev.map((u) => {
          if (u.cashedOut) return u;
          return {
            ...u,
            profit: -u.amount,
            multiplier: "-",
          };
        })
      );
    });

    socket.on("balanceUpdated", ({ userId, newBalance }) => {
      const myId = localStorage.getItem("userId");
      if (userId === myId) setAvailableBalance(newBalance);
    });

    return () => socket.disconnect();
  }, []);

  const randomAmountUGX = () => {
    const roll = Math.random();
    if (roll < 0.2) return Math.floor(Math.random() * (100000 - 20000 + 1)) + 20000;
    else if (roll < 0.5) return Math.floor(Math.random() * (450000 - 100000 + 1)) + 100000;
    return Math.floor(Math.random() * (1200000 - 450000 + 1)) + 450000;
  };

  const handlePlaceBet = async () => {
    setBetError("");
    setGeneralError("");
    if (countdown === null) return setGeneralError("❌ You can only place bets during countdown!");
    if (!betAmount || betAmount < 100) return setBetError("❌ Minimum bet is UGX 100");
    if (betAmount > availableBalance) return setBetError("❌ Insufficient balance!");
    if (useAutoCashout && autoCashout && !/^\d+(\.\d{1,2})?$/.test(autoCashout))
      return setBetError("❌ Auto cashout must have up to two decimals");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "https://crash-game-sse3.onrender.com/api/bet/bet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            amount: betAmount,
            ...(useAutoCashout && autoCashout ? { autoCashOut: parseFloat(Number(autoCashout).toFixed(2)) } : {}),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place bet");
      setAvailableBalance(data.newBalance);
      setBetPlaced(true);
      setWaitingForStart(true);
    } catch (err) {
      setGeneralError("❌ Bet failed: " + err.message);
    }
  };

  const handleWithdraw = async () => {
    if (running && betPlaced && !cashedOut) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          "https://crash-game-sse3.onrender.com/api/bet/withdraw",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        setGeneralError("❌ Withdraw failed: " + err.message);
      }
    }
  };

  const data = { datasets: [{ label: "Multiplier", data: chartData, borderColor: showCrash ? "#FF0000" : "#FF5733", borderWidth: 2, tension: 0.25, pointRadius: 0 }] };
  const options = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { type: "linear", title: { display: true, text: "Time (s)" }, ticks: { color: "white", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.15)" }, min: 0, suggestedMax: 15 }, y: { min: 1, ticks: { color: "white", callback: (v) => v + "x" }, grid: { color: "rgba(255,255,255,0.15)" }, suggestedMax: Math.ceil(multiplier) + 1 } } };

  const handleAutoCashoutChange = (e) => {
    const v = e.target.value; if (v === "") return setAutoCashout(""); if (/^\d*(?:\.\d{0,2})?$/.test(v)) setAutoCashout(v);
  };
  const handleAutoCashoutBlur = () => { if (autoCashout) setAutoCashout(parseFloat(autoCashout).toFixed(2)); };

  return (
    <div className="flex flex-col items-center p-4 space-y-4 w-full text-white">
      {/* Chart */}
      <div className="relative w-full bg-black p-2 rounded shadow h-64 sm:h-80 md:h-[28rem] flex items-center justify-center">
        <Line data={data} options={options} />
        {countdown !== null && <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold text-yellow-400 pointer-events-none">Next round in: {typeof countdown === "number" ? countdown.toFixed(1) : countdown}s</div>}
        {running && multiplier >= 1 && <div className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-white pointer-events-none">{multiplier.toFixed(2)}x</div>}
        {!countdown && !running && showCrash && <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-extrabold text-red-500 animate-pulse pointer-events-none">💥 {showCrash}x</div>}
      </div>

      {/* Result */}
      {result && <div className={`text-2xl sm:text-3xl md:text-4xl font-extrabold animate-fadeout ${result.type === "win" ? "text-green-400" : "text-red-400"}`}>{result.type === "win" ? `🎉 Congratulations! You won UGX ${result.amount}` : `💥 Oops! You lost UGX ${result.amount}`}</div>}

      {/* Bet Controls */}
      {showControls && (isLoggedIn ? (
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-end justify-between w-full max-w-3xl">
            <div className="w-24 hidden sm:block" />
            <div className="flex items-end gap-4 mx-auto flex-wrap sm:flex-nowrap justify-center">
              <div className="flex flex-col"><label className="block text-xs">Bet Amount (UGX)</label><input type="number" value={betAmount || ""} onChange={(e) => setBetAmount(Number(e.target.value))} className="border p-1 rounded w-28 sm:w-28 md:w-32 text-center text-black" placeholder="Enter amount" min={100} /></div>
              <div className="flex flex-col"><label className="block text-xs">Auto Cash Out (x)</label><input type="text" inputMode="decimal" value={autoCashout} onChange={handleAutoCashoutChange} onBlur={handleAutoCashoutBlur} disabled={!useAutoCashout} className={`border p-1 rounded w-24 sm:w-24 md:w-28 text-center ${useAutoCashout ? "text-black" : "bg-gray-300 text-gray-500"}`} /></div>
              <div className="flex flex-col"><button className={`px-4 py-2 rounded-lg text-white font-semibold text-sm ${waitingForStart ? "bg-gray-600 cursor-not-allowed" : running && betPlaced && !cashedOut ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`} onClick={running && betPlaced && !cashedOut ? handleWithdraw : handlePlaceBet} disabled={waitingForStart || (running && cashedOut)}>{waitingForStart ? "Waiting..." : running && betPlaced && !cashedOut ? "Withdraw" : "Place Bet"}</button></div>
            </div>
            <label className="flex flex-col items-center cursor-pointer select-none"><span className="text-xs mb-1">Auto</span><div className="relative"><input type="checkbox" className="sr-only" checked={useAutoCashout} onChange={() => setUseAutoCashout(!useAutoCashout)} /><div className="block w-10 h-5 bg-gray-400 rounded-full" /><div className={`absolute left-1 top-0.5 w-4 h-4 rounded-full transition ${useAutoCashout ? "translate-x-5 bg-blue-500" : "bg-white"}`} /></div></label>
          </div>
          <div className="flex flex-col items-center text-center mt-2 min-h-[20px]">
            {betError && <p className="text-red-400 text-xs font-bold animate-fadeout">{betError}</p>}
            {generalError && <p className="text-red-400 text-xs font-bold animate-fadeout">{generalError}</p>}
            {waitingForStart && <p className="text-green-400 text-sm font-bold animate-fadeout">✅ Bet placed, waiting for game to start...</p>}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 italic text-sm">Log in to place bets and cash out.</p>
      ))}

      {/* History */}
      <div className="flex space-x-1 flex-wrap justify-center">
        {history.map((h, i) => <span key={i} className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(h) < 2 ? "bg-red-200 text-red-700" : "bg-green-200 text-green-700"}`}>{h}</span>)}
      </div>

      {/* Live Users */}
      <div className="w-full bg-gray-900 rounded p-2">
        <h3 className="text-sm font-bold mb-2">Live Users</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-4 text-xs border-b border-gray-800 pb-1 font-bold">
            <span>User</span>
            <span>Bet</span>
            <span>Cashout</span>
            <span>Profit</span>
          </div>
          {liveUsers.map((u, idx) => (
            <div key={idx} className="grid grid-cols-4 text-xs border-b border-gray-800 py-0.5">
              <span className="truncate max-w-[80px]">{u.user}</span>
              <span>{u.amount === "-" ? "-" : `UGX ${u.amount.toLocaleString()}`}</span>
              <span>{u.cashedOut ? `${typeof u.multiplier === "number" ? u.multiplier.toFixed(2) : u.multiplier}x` : "-"}</span>
              <span className={u.profit && u.profit !== "-" && u.profit > 0 ? "text-green-400" : u.profit && u.profit !== "-" && u.profit < 0 ? "text-red-400" : "text-gray-300"}>{u.profit === "-" ? "-" : `UGX ${Number(u.profit).toLocaleString()}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
