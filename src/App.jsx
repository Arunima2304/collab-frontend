
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Room from "./components/Room";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* The "/" path is now the Login Page */}
        <Route path="/" element={<Login />} />
        
        {/* The Room path captures the dynamic ID */}
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </Router>
  );
}

export default App;