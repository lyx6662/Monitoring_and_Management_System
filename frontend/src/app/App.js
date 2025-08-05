// src/App.js
import React, { useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DeviceList from "../DeviceList";
import './App.css';

function Home() {
  const [newDevice, setNewDevice] = useState({ id: "", name: "", date: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice({ ...newDevice, [name]: value });
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/devices", newDevice);
      setSuccess(response.data.message);
      setNewDevice({ id: "", name: "", date: "" });
    } catch (err) {
      setError(err.response?.data.error || "Failed to add device");
    }
  };

  return (
    <div className="app-container">
      <h1>Add New Device</h1>
      <Link to="/devices" style={{ marginBottom: "20px", display: "block" }}>
        View All Devices →
      </Link>
      <form onSubmit={addDevice}>
        <div className="form-group">
          <label>ID: </label>
          <input
            type="text"
            name="id"
            value={newDevice.id}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Name: </label>
          <input
            type="text"
            name="name"
            value={newDevice.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Date: </label>
          <input
            type="date"
            name="date"
            value={newDevice.date}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit" className="submit-btn">Add Device</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="error-message">{success}</p>}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/devices" element={<DeviceList />} />
      </Routes>
    </Router>
  );
}

export default App;