import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link, href } from 'react-router-dom';
import "../Chatbot.css"; // Note the path is now ../
import { API_URL } from '../config'; // Import the API_URL from config.js

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null); // State for the uploaded file
    const fileInputRef = useRef(null); // Ref to trigger file input click

    // This effect runs once when the component loads to fetch history
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/login');
            return; // Exit if not logged in
        }

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    handleLogout(); // Token is invalid, log out
                    return;
                }
                if (!response.ok) throw new Error('Failed to fetch history');

                const data = await response.json();
                const formattedHistory = data.history.map(msg => ({
                    id: crypto.randomUUID(),
                    role: msg.role === 'assistant' ? 'bot' : 'user',
                    text: msg.content
                }));
                setMessages(formattedHistory);
            } catch (error) {
                console.error("History fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        inputRef.current?.focus();
    }, [navigate]);

    // This effect scrolls down whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    async function sendMessage(e) {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        // --- ADD THIS BLOCK ---
        // Check for the "new entry" trigger phrase
        if (trimmed.toLowerCase() === 'new entry') {
            navigate('/journal'); // Redirect to the journal page
            return; // Stop the function here
        }

        const userMsg = { id: crypto.randomUUID(), role: "user", text: trimmed };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: trimmed })
            });
            if (response.status === 401 || response.status === 403) {
                handleLogout();
                return;
            }
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const botMsg = { id: crypto.randomUUID(), role: "bot", text: data.response };
            setMessages((m) => [...m, botMsg]);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { id: crypto.randomUUID(), role: "bot", text: 'An error occurred. Please try again.' };
            setMessages((m) => [...m, errorMessage]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    function clearChat() {
        // const token = localStorage.getItem('authToken');
        // fetch('http://localhost:3000/api/clear', {
        //     method: 'POST',
        //     headers: { 'Authorization': `Bearer ${token}` }
        // });
        // setMessages([]);
        // inputRef.current?.focus();
        window.location.href = 'http://www.google.com';
        handleLogout();
    }

    // Handles when a user selects a file from the dialog
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // Handles the upload to the backend when the "Upload" button is clicked
    const handleFileUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        const userMsg = { id: crypto.randomUUID(), role: "user", text: `Analyzing document: ${selectedFile.name}` };
        setMessages((m) => [...m, userMsg]);
        
        const formData = new FormData();
        formData.append('document', selectedFile); // The key 'document' must match the backend

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (response.status === 401 || response.status === 403) {
                handleLogout(); // Assumes handleLogout is defined elsewhere
                return;
            }
            if (!response.ok) throw new Error('File analysis failed.');

            const data = await response.json();
            const botMsg = { id: crypto.randomUUID(), role: "bot", text: data.analysis };
            setMessages((m) => [...m, botMsg]);

        } catch (error) {
            console.error('Error uploading file:', error);
            const errorMessage = { id: crypto.randomUUID(), role: "bot", text: 'Sorry, I failed to analyze the document.' };
            setMessages((m) => [...m, errorMessage]);
        } finally {
            setSelectedFile(null); // Clear the selected file
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = null; // Reset file input for next upload
            }
        }
    };

    // In Frontend/src/pages/ChatPage.js

    return (
        <div className="chatbot-container">
            <header className="chatbot-header">
                <div className="header-actions-left">
                    <Link to="/journal" className="clear-button">My Journal</Link>
                </div>
                <div className="header-title">
                <h1>
                    <span className="brand-purple">Be</span>
                    <span className="brand-pink">Still</span> Helper
                </h1>
                </div>
                <div className="header-actions-right">
                    <Link to="/profile" className="clear-button">Profile</Link>
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="clear-button">
                            Clear
                        </button>
                    )}
                    <button onClick={handleLogout} className="clear-button">
                        Logout
                    </button>
                </div>
            </header>
            <main className="chatbot-main">
                <section className="chatbot-section">
                    {/* This is the new main content wrapper */}
                    <div className="chat-content-wrapper">
                        {/* Column 1: Chat Messages */}
                        <div className="chat-area">
                            <div className="chat-messages" role="log" aria-live="polite">
                                {messages.length === 0 && !loading ? (
                                    <div className="initial-view">
                                        <div className="chatbot-title">
                                            <img
                                                src="https://images.squarespace-cdn.com/content/v1/674239e221e74d6e8cd69bf6/ebf9a587-bc2b-432e-84c8-ba801ab821ff/BSF+Logo+%282%29.png?format=500w"
                                                alt="Be Still Foundation Logo"
                                                className="chatbot-logo"
                                            />
                                            <h1>
                                                <span className="brand-purple">Be</span>
                                                <span className="brand-pink">Still</span> Helper
                                            </h1>
                                            <p>Gentle guidance. Private and supportive.</p>
                                        </div>
                                        <HintCards />
                                    </div>
                                ) : (
                                    messages.map((m) => (
                                        <MessageBubble key={m.id} role={m.role} text={m.text} />
                                    ))
                                )}
                                {loading && <BotTyping />}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={sendMessage} className="chat-form">
                                <div className="chat-input-container">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            loading
                                                ? "Thinking…"
                                                : "Ask about help, safety, or emotional support…"
                                        }
                                        className="chat-input"
                                        aria-label="Message"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        accept=".txt,.pdf,.doc,.docx"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="upload-button"
                                        title="Upload a document for analysis"
                                    >
                                    📎
                                    </button>
                                    <div className="chat-actions">
                                    {loading ? (
                                        <div className="spinner" />
                                    ) : (
                                        selectedFile ? (
                                            <button onClick={handleFileUpload} type="button" className="send-button">
                                                Upload
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                className="send-button"
                                                disabled={!input.trim()}
                                            >
                                                Send
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </form>
                        <footer className="chat-footer">
                            If you’re in immediate danger, call emergency services. Your conversation is saved privately.
                        </footer>
                        </div>
                        {/* Column 2: Sidebar with Hint Cards (only appears after chat starts) */}
                        {messages.length > 0 && (
                            <aside className="sidebar-area">
                                <HintCards />
                            </aside>
                        )}
                        
                    </div>
                    

                    
                </section>
            </main>
        </div>
    );
}

// Helper components from your original App.js
function MessageBubble({ role, text }) {
    const isUser = role === "user";
    return (
      <div className={`message-row ${isUser ? "user" : "bot"}`}>
        <div className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
          {text}
        </div>
      </div>
    );
}

function BotTyping() {
    return (
      <div className="message-row bot">
        <div className="bot-bubble typing">
          <span className="dot" />
          <span className="dot delay1" />
          <span className="dot delay2" />
        </div>
      </div>
    );
}

function HintCards() {
    const items = [
      {
        title: "Safety planning",
        text: "Learn how to prepare important items, safe spaces, and trusted contacts.",
        URL: "https://www.be-still-foundation.com/founding-attorney-network"
    
      },
      {
        title: "Support network",
        text: "Find shelters, hotlines, or emotional help near you.",
        URL: "https://www.be-still-foundation.com/donate"
      },
      {
        title: "Know your rights",
        text: "Get general information on protective measures and reporting options.",
        URL: "https://www.womenslaw.org"
      },
    ];
    return (
      <div className="hint-grid">
        {items.map((it) => (
          // Each card is now a link that opens in a new tab
          <a
            key={it.title}
            href={it.URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hint-card-link"
          >
            <div className="hint-card">
              <div className="hint-title">{it.title}</div>
              <div className="hint-text">{it.text}</div>
            </div>
          </a>
        ))}
      </div>
    );
}