// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLanding from "./AdminLanding";
import AdminDashboard from "./AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin login / landing */}
        <Route path="/" element={<AdminLanding />} />

        {/* Admin dashboard */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
