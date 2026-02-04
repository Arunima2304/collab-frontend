import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";

// PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- CONNECT TO YOUR RENDER CLOUD SERVER ---
const socket = io.connect("https://collab-server-arunima.onrender.com");

const Room = () => {
  const { roomId } = useParams();
  
  // --- GET REAL USERNAME ---
  const currentUser = localStorage.getItem("username") || "Anonymous";

  // --- STATE ---
  const [cursors, setCursors] = useState({});
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [pdfUrl, setPdfUrl] = useState(null); 
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);

  const [activeTool, setActiveTool] = useState("none");
  const [tempNote, setTempNote] = useState(null); 
  const containerRef = useRef(null);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    // 1. LISTEN FOR MESSAGES (Chat)
    socket.on("receive_message", (data) => {
      console.log("📩 New Message Received:", data);
      setMessages((p) => [...p, data]);
    });

    // 2. LISTEN FOR HISTORY (On Join/Refresh)
    socket.on("load_messages", (oldMessages) => {
      console.log("📜 Loaded History:", oldMessages);
      setMessages(oldMessages);
    });

    // 3. OTHER LISTENERS
    socket.on("load_data", ({ highlights, notes }) => {
      setHighlights(highlights);
      setNotes(notes);
    });
    
    socket.on("receive_highlight", (data) => setHighlights((p) => [...p, data]));
    socket.on("receive_note", (data) => setNotes((p) => [...p, data]));
    socket.on("receive_cursor", (data) => setCursors((p) => ({ ...p, [data.userId]: data })));
    
    socket.on("receive-pdf", (url) => {
      setPdfUrl(url);
      setPageNumber(1); 
    });

    socket.on("receive_page_change", (newPage) => {
      setPageNumber(newPage);
    });

    // 4. JOIN ROOM
    socket.emit("join_room", roomId);

    return () => socket.off(); 
  }, [roomId]);

  // --- ACTIONS ---

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const msg = { 
      room: roomId, 
      message: newMessage, 
      author: currentUser, 
      time: new Date().toLocaleTimeString() 
    };

    // Update Local View Immediately
    setMessages((p) => [...p, msg]);
    
    // Send to Server
    socket.emit("send_message", msg);
    setNewMessage("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      // --- UPLOAD TO RENDER SERVER ---
      const res = await axios.post("https://collab-server-arunima.onrender.com/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = res.data.url;
      setPdfUrl(uploadedUrl);
      setPageNumber(1); 
      socket.emit("upload-pdf", { room: roomId, url: uploadedUrl });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload PDF.");
    }
  };

  const changePage = (offset) => {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      socket.emit("change_page", { room: roomId, page: newPage });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    socket.emit("cursor_move", { roomId, userId: socket.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseDown = (e) => {
    if (activeTool !== "highlight") return;
    const rect = containerRef.current.getBoundingClientRect();
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = (e) => {
    if (activeTool !== "highlight" || !startPos) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);

    if (width > 5 && height > 5) {
      const newHighlight = { x, y, width, height, roomId, page: pageNumber }; 
      setHighlights((p) => [...p, newHighlight]);
      socket.emit("send_highlight", newHighlight);
    }
    setStartPos(null);
  };

  const handleContainerClick = (e) => {
    if (activeTool !== "note") return;
    if (e.target.closest(".note-input-popup")) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTempNote({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: "" });
    setActiveTool("none"); 
  };

  const submitNote = () => {
    if (tempNote.text.trim()) {
      const finalNote = { ...tempNote, roomId, author: currentUser };
      setNotes((p) => [...p, finalNote]);
      socket.emit("send_note", finalNote);
    }
    setTempNote(null);
  };

  return (
    <div className="room-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>CollabStudy</h3>
          <div className="room-code-box">Room: {roomId}</div>
          <div style={{fontSize: "0.8rem", color: "#888"}}>User: {currentUser}</div>
        </div>

        <div className="toolbar">
           <label className="btn-secondary" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
             📂 Upload
             <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: "none" }} />
           </label>

           <button className={activeTool === "highlight" ? "active-tool" : ""} onClick={() => setActiveTool("highlight")}>
             🖍 Highlight
           </button>
           <button className={activeTool === "note" ? "active-tool" : ""} onClick={() => setActiveTool("note")}>
             📌 Note
           </button>

           <div style={{marginTop: '10px', display: 'flex', gap: '5px', justifyContent: 'center'}}>
             <button disabled={pageNumber <= 1} onClick={() => changePage(-1)}>⬅</button>
             <span style={{color: 'white', alignSelf: 'center'}}> {pageNumber} / {numPages || "--"} </span>
             <button disabled={pageNumber >= numPages} onClick={() => changePage(1)}>➡</button>
           </div>
        </div>

        <div className="chat-container">
          <div className="chat-window">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.author === currentUser ? "my-msg" : ""}`}>
                <b>{m.author}:</b> {m.message}
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>

      <div 
        className="pdf-container"
        ref={containerRef}
        style={{ cursor: activeTool === "note" ? "copy" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleContainerClick}
      >
        {pdfUrl ? (
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={pageNumber} width={600} renderTextLayer={false} />
            </Document>
        ) : (
            <div style={{color: 'white', padding: '2rem'}}>Waiting for PDF...</div>
        )}

        {highlights.map((h, i) => (
            // Only show highlights for CURRENT PAGE
            h.page === pageNumber || !h.page ? (
                <div key={i} className="highlight-box" style={{ left: h.x, top: h.y, width: h.width, height: h.height }} />
            ) : null
        ))}

        {notes.map((n, i) => (
          <div key={i} className="note-marker" style={{ left: n.x, top: n.y }} title={n.text}>📌<div className="note-tooltip">{n.text}</div></div>
        ))}

        {tempNote && (
          <div className="note-input-popup" style={{ left: tempNote.x, top: tempNote.y }}>
            <textarea autoFocus placeholder="Type your note..." value={tempNote.text} onChange={(e) => setTempNote({ ...tempNote, text: e.target.value })} />
            <button onClick={submitNote}>Save</button>
            <button onClick={() => setTempNote(null)} style={{background: '#555'}}>Cancel</button>
          </div>
        )}

        {Object.keys(cursors).map((key) => (
          <div key={key} className="cursor" style={{ left: cursors[key].x, top: cursors[key].y }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="red" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}><path d="M5.5 3.21l12.32 10.94-5.83.6 2.85 6.84-2.58 1.07-2.85-6.83-4.14 4.16V3.21z"/></svg>
            <span style={{ position:'absolute', top:20, left:10, backgroundColor:'red', color:'white', padding:'2px 5px', borderRadius:'4px', fontSize:'10px' }}>User</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;