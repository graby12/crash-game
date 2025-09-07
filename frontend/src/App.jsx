import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameDashboard from "./Landing";  // Ensure this import is correct
import HomePage from "./Homepage.jsx";      // Ensure this import is correct

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root Route */}
        <Route path="/" element={<GameDashboard />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
