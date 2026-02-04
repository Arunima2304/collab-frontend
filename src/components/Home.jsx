import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const Home = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const createRoom = () => {
    const id = uuidv4();
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (roomId) navigate(`/room/${roomId}`);
  };

  return (
    <div className="home-container">
      {/* The Stars Background Layer */}
      <div className="stars"></div>

      <div className="logo">CollabStudy 🚀</div>
      <p className="tagline">Real-time study rooms for everyone.</p>

      <div className="card">
        <button className="btn-primary" onClick={createRoom}>
          + Create New Room
        </button>

        <div className="divider">or join existing</div>

        <div className="input-group">
          <input
            placeholder="Paste Room Code here..."
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button className="btn-secondary" onClick={joinRoom}>
            Join Room &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;