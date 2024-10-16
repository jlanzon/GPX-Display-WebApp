import React from "react";
import { Routes, Route } from "react-router-dom";
import GPXPage from "./Pages/GPXPage";
import Home from "./Pages/Home";

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/GPX-Display-WebApp/" element={<Home />} />
        <Route path="/GPX-Display-WebApp/gpx" element={<GPXPage />} />
      </Routes>

      <footer className="footer bottom-0 absolute w-[100vw]">
        <p>&copy; {new Date().getFullYear()} JLanzon GPX Mapping</p>
      </footer>
    </div>
  );
}

export default App;
