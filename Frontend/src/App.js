// import React, { useEffect, useRef, useState } from "react";
// // Make sure to import the correct CSS file
// import "./Chatbot.css";

// export default function App() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [userId, setUserId] = useState(null); // State to hold the user's unique ID
//   const inputRef = useRef(null);
//   const messagesEndRef = useRef(null); // Ref to auto-scroll

//   // Effect to get or create a userId on component mount
//   useEffect(() => {
//     let currentUserId = localStorage.getItem('chatbotUserId');
//     if (!currentUserId) {
//         currentUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//         localStorage.setItem('chatbotUserId', currentUserId);
//     }
//     setUserId(currentUserId);
//     inputRef.current?.focus();
//   }, []);

//   // Effect to scroll to the latest message
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, loading]);


//   // Handles sending of user messages and bot responses
//   async function sendMessage(e) {
//     e?.preventDefault();
//     const trimmed = input.trim();
//     if (!trimmed || loading || !userId) return;

//     const userMsg = { id: crypto.randomUUID(), role: "user", text: trimmed };
//     setMessages((m) => [...m, userMsg]);
//     setInput("");
//     setLoading(true);

//     try {
//         const response = await fetch('http://localhost:3000/chat', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 userId: userId,
//                 prompt: trimmed
//             })
//         });

//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }

//         const data = await response.json();
//         const botMsg = { id: crypto.randomUUID(), role: "bot", text: data.response };
//         setMessages((m) => [...m, botMsg]);

//     } catch (error) {
//         console.error('Error sending message:', error);
//         const errorMessage = { id: crypto.randomUUID(), role: "bot", text: 'Sorry, I encountered an error. Please make sure the backend server is running.' };
//         setMessages((m) => [...m, errorMessage]);
//     } finally {
//         setLoading(false);
//         inputRef.current?.focus();
//     }
//   }

//   // Clears all messages and resets the chat
//   function clearChat() {
//     // We also need to clear the history on the server
//     if(userId) {
//         fetch('http://localhost:3000/clear', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ userId: userId })
//         });
//     }
//     setMessages([]);
//     setInput("");
//     inputRef.current?.focus();
//   }

//   return (
//     <div className="chatbot-container">
//       <header className="chatbot-header">
//         {messages.length > 0 && (
//           <button onClick={clearChat} className="clear-button">
//             Clear
//           </button>
//         )}
//       </header>
//       <main className="chatbot-main">
//         <section className="chatbot-section">
//           <div className="chatbot-title">
//             <img
//               src="https://images.squarespace-cdn.com/content/v1/674239e221e74d6e8cd69bf6/ebf9a587-bc2b-432e-84c8-ba801ab821ff/BSF+Logo+%282%29.png?format=500w"
//               alt="Be Still Foundation Logo"
//               className="chatbot-logo"
//             />
//             <h1>
//               <span className="brand-purple">Be</span>
//               <span className="brand-pink">Still</span> Helper
//             </h1>
//             <p>Gentle guidance. Private and supportive.</p>
//           </div>
//           <form onSubmit={sendMessage} className="chat-form">
//             <div className="chat-input-container">
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 placeholder={
//                   loading
//                     ? "Thinking…"
//                     : "Ask about help, safety, or emotional support…"
//                 }
//                 className="chat-input"
//                 aria-label="Message"
//               />
//               <div className="chat-actions">
//                 {loading ? (
//                   <div className="spinner" />
//                 ) : (
//                   <button
//                     type="submit"
//                     className="send-button"
//                     disabled={!input.trim()}
//                   >
//                     Send
//                   </button>
//                 )}
//               </div>
//             </div>
//           </form>
//           <div className="chat-messages" role="log" aria-live="polite">
//             {messages.length === 0 ? (
//               <HintCards />
//             ) : (
//               messages.map((m) => (
//                 <MessageBubble key={m.id} role={m.role} text={m.text} />
//               ))
//             )}
//             {loading && <BotTyping />}
//             {/* This div is used to scroll to the bottom */}
//             <div ref={messagesEndRef} />
//           </div>
//           <footer className="chat-footer">
//             If you’re in immediate danger, call emergency services. Your conversation is saved privately.
//           </footer>
//         </section>
//       </main>
//     </div>
//   );
// }

// // These helper components from your file remain unchanged
// function MessageBubble({ role, text }) {
//     const isUser = role === "user";
//     return (
//       <div className={`message-row ${isUser ? "user" : "bot"}`}>
//         <div className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
//           {text}
//         </div>
//       </div>
//     );
// }

// function BotTyping() {
//     return (
//       <div className="message-row bot">
//         <div className="bot-bubble typing">
//           <span className="dot" />
//           <span className="dot delay1" />
//           <span className="dot delay2" />
//         </div>
//       </div>
//     );
// }

// function HintCards() {
//     const items = [
//       {
//         title: "Safety planning",
//         text: "Learn how to prepare important items, safe spaces, and trusted contacts.",
//       },
//       {
//         title: "Support network",
//         text: "Find shelters, hotlines, or emotional help near you.",
//       },
//       {
//         title: "Know your rights",
//         text: "Get general information on protective measures and reporting options.",
//       },
//     ];
//     return (
//       <div className="hint-grid">
//         {items.map((it) => (
//           <div key={it.title} className="hint-card">
//             <div className="hint-title">{it.title}</div>
//             <div className="hint-text">{it.text}</div>
//           </div>
//         ))}
//       </div>
//     );
// }


import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;