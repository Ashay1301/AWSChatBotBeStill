import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../Chatbot.css";

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null); // State for the uploaded file
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null); // Ref to trigger file input click
    const navigate = useNavigate();

    useEffect(() => {
        // (This useEffect for fetching history remains the same)
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/login');
            return;
        }
        const fetchHistory = async () => { /* ... */ };
        fetchHistory();
        inputRef.current?.focus();
    }, [navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleLogout = () => { /* ... */ };
    const sendMessage = async (e) => { /* ... */ };
    const clearChat = () => { /* ... */ };

    // --- NEW: Function to handle file selection and upload ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        // Add a message indicating a file is being analyzed
        const userMsg = { id: crypto.randomUUID(), role: "user", text: `Analyzing document: ${selectedFile.name}` };
        setMessages((m) => [...m, userMsg]);
        
        const formData = new FormData();
        formData.append('document', selectedFile); // The key 'document' must match the backend

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/analyze', {
                method: 'POST',
                headers: {
                    // No 'Content-Type' header needed; browser sets it for FormData
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (response.status === 401 || response.status === 403) {
                handleLogout();
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
        }
    };

    return (
        <div className="chatbot-container">
            <header className="chatbot-header">
                {/* ... (header buttons remain the same) ... */}
            </header>
            <main className="chatbot-main">
                <section className="chatbot-section">
                    {/* ... (chatbot title remains the same) ... */}
                    
                    <form onSubmit={sendMessage} className="chat-form">
                        <div className="chat-input-container">
                            {/* --- NEW: File Upload Button --- */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }} // Hide the default input
                                accept=".txt,.pdf,.doc,.docx" // Optional: restrict file types
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()} // Trigger the hidden input
                                className="upload-button"
                            >
                               📎 
                            </button>

                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={selectedFile ? `File ready: ${selectedFile.name}` : "Ask a question or upload a file..."}
                                className="chat-input"
                                aria-label="Message"
                                disabled={!!selectedFile} // Disable text input if a file is selected
                            />
                            <div className="chat-actions">
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    // --- MODIFIED: Show Upload or Send button ---
                                    selectedFile ? (
                                        <button onClick={handleFileUpload} type="button" className="send-button">Upload</button>
                                    ) : (
                                        <button type="submit" className="send-button" disabled={!input.trim()}>Send</button>
                                    )
                                )}
                            </div>
                        </div>
                    </form>
                    
                    {/* ... (rest of the chat UI remains the same) ... */}
                </section>
            </main>
        </div>
    );
}

// ... (Your MessageBubble, BotTyping, and HintCards components remain the same)