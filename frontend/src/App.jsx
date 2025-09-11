import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameDashboard from "./Landing";   // Landing page (login/register + preview chart)
import HomePage from "./Homepage.jsx";   // Your existing homepage (if you still want it)
import CrashGame from "./CrashGame.jsx"; // The actual crash game

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Route */}
        <Route path="/" element={<GameDashboard />} />

        {/* Optional homepage route if you still need it */}
        <Route path="/home" element={<HomePage />} />

        {/* Crash game route */}
        <Route path="/crash" element={<CrashGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
