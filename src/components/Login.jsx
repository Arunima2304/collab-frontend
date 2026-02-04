import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const Login = () => {
  const [step, setStep] = useState(1); // 1 = Auth, 2 = Room Selection
  const [isRegister, setIsRegister] = useState(false);
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  // --- STEP 1: AUTHENTICATION ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const endpoint = isRegister ? "/register" : "/login";
      
      // ✅ UPDATED: Connects to your Render Cloud Server
      const res = await axios.post(`https://collab-server-arunima.onrender.com/api/auth${endpoint}`, {
        username,
        email: isRegister ? email : undefined, 
        password,
      });

      if (isRegister) {
        // If registered, switch to login view
        setIsRegister(false);
        alert("Account created! Please login.");
      } else {
        // If login success, save token & move to next step
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("username", res.data.username);
        setStep(2); // Show Room selection
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong! Check credentials.");
    }
  };

  // --- STEP 2: JOIN ROOM ---
  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomId) return;
    navigate(`/room/${roomId}`);
  };

  const createNewRoom = () => {
    const newId = uuidv4().slice(0, 8);
    setRoomId(newId);
  };

  return (
    <div className="home-container">
      <div className="stars"></div>

      <div className="card">
        <h1 className="logo">CollabStudy</h1>
        
        {step === 1 && (
          <>
            <p className="tagline">{isRegister ? "Create Account" : "Welcome Back"}</p>
            {error && <p style={{color: 'red', fontSize: '0.8rem'}}>{error}</p>}

            <form onSubmit={handleAuth}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              {/* Only show Email if Registering */}
              {isRegister && (
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <button type="submit" className="btn-primary">
                {isRegister ? "Sign Up" : "Login"}
              </button>
            </form>

            <div className="divider">OR</div>
            <button 
              className="btn-secondary" 
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Already have an account? Login" : "Need an account? Register"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="tagline">Hello, {username}! 👋</p>
            
            <form onSubmit={joinRoom}>
              <input
                type="text"
                placeholder="Enter Room Code..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              
              <button type="submit" className="btn-primary">
                Join Room 🚀
              </button>

              <div className="divider">OR</div>
              
              <button type="button" className="btn-secondary" onClick={createNewRoom}>
                Generate Random Code
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;