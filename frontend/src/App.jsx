import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameDashboard from "./Landing";   // Landing page
import HomePage from "./Homepage.jsx";   // Homepage
import CrashGame from "./CrashGame.jsx"; // Crash game
import TermsModal from "./TermsModal.jsx"; // ✅ Using same modal

function App() {
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <BrowserRouter>
      {/* Global TermsModal (for popup use anywhere in app) */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      <Routes>
        {/* Landing */}
        <Route path="/" element={<GameDashboard />} />

        {/* Home */}
        <Route path="/home" element={<HomePage />} />

        {/* Crash */}
        <Route path="/crash" element={<CrashGame />} />

        {/* ✅ Terms page reuses same modal but forces it open */}
        <Route
          path="/terms"
          element={
            <TermsModal
              isOpen={true}
              onClose={() => window.history.back()} // Go back when closed
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;