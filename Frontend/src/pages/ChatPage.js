import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../Chatbot.css";

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

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
                const response = await fetch('http://localhost:3000/api/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    handleLogout(); // Token is invalid, log out
                    return;
                }
                if (!response.ok) throw new Error('Failed to fetch history');

                const data = await response.json();
                // Map backend data ({role, content}) to frontend state ({id, role, text})
                const formattedHistory = data.history.map(msg => ({
                    id: crypto.randomUUID(),
                    role: msg.role === 'assistant' ? 'bot' : 'user', // Translate 'assistant' to 'bot'
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
    }, [navigate]); // The dependency array ensures this runs only once

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

        const userMsg = { id: crypto.randomUUID(), role: "user", text: trimmed };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/chat', {
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
        const token = localStorage.getItem('authToken');
        fetch('http://localhost:3000/api/clear', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setMessages([]);
        inputRef.current?.focus();
    }
    
    return (
        <div className="chatbot-container">
          <header className="chatbot-header">
            {messages.length > 0 && (
              <button onClick={clearChat} className="clear-button">
                Clear
              </button>
            )}
            <button onClick={handleLogout} className="clear-button" style={{marginLeft: '10px'}}>Logout</button>
          </header>
          <main className="chatbot-main">
            <section className="chatbot-section">
                <div className="chatbot-title">
                  <img src="https://images.squarespace-cdn.com/content/v1/674239e221e74d6e8cd69bf6/ebf9a587-bc2b-432e-84c8-ba801ab821ff/BSF+Logo+%282%29.png?format=500w" alt="Be Still Foundation Logo" className="chatbot-logo"/>
                  <h1><span className="brand-purple">Be</span><span className="brand-pink">Still</span> Helper</h1>
                  <p>Gentle guidance. Private and supportive.</p>
                </div>
                <form onSubmit={sendMessage} className="chat-form">
                  <div className="chat-input-container">
                    <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={ loading ? "Thinking…" : "Ask about help, safety, or emotional support…"} className="chat-input" aria-label="Message" />
                    <div className="chat-actions">
                      {loading ? ( <div className="spinner" /> ) : ( <button type="submit" className="send-button" disabled={!input.trim()}>Send</button> )}
                    </div>
                  </div>
                </form>
                <div className="chat-messages" role="log" aria-live="polite">
                  {messages.length === 0 && !loading ? ( <HintCards /> ) : ( messages.map((m) => ( <MessageBubble key={m.id} role={m.role} text={m.text} /> )))}
                  {loading && <BotTyping />}
                  <div ref={messagesEndRef} />
                </div>
                <footer className="chat-footer">
                  If you’re in immediate danger, call emergency services. Your conversation is saved privately.
                </footer>
            </section>
          </main>
        </div>
    );
}

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
      { title: "Safety planning", text: "Learn how to prepare important items, safe spaces, and trusted contacts." },
      { title: "Support network", text: "Find shelters, hotlines, or emotional help near you." },
      { title: "Know your rights", text: "Get general information on protective measures and reporting options." },
    ];
    return (
      <div className="hint-grid">
        {items.map((it) => (
          <div key={it.title} className="hint-card">
            <div className="hint-title">{it.title}</div>
            <div className="hint-text">{it.text}</div>
          </div>
        ))}
      </div>
    );
}