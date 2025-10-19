import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './JournalPage.css'; // We'll create this CSS file
import { API_URL } from '../config'; // Import the API_URL from config.js

export default function JournalPage() {
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState({
        title: '',
        eventDate: '',
        content: '',
        incidentDetails: {
            typeOfAbuse: [],
            childrenPresent: false,
            weaponInvolved: false,
            injuryOccurred: false,
            injuryDescription: '',
            evidenceAvailable: [],
            policeReportNumber: '',
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem('authToken');

    const fetchEntries = useCallback(async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/journal', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch journal entries.');
            const data = await response.json();
            setEntries(data.journalEntries);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('http://localhost:3000/api/journal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(newEntry),
            });
            if (!response.ok) throw new Error('Failed to save entry.');
            
            // Reset form and refresh entries
            setNewEntry({ title: '', eventDate: '', content: '' });
            setIsFormVisible(false);
            fetchEntries(); // Re-fetch to show the new entry
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCheckboxChange = (e, field) => {
        const { value, checked } = e.target;
        setNewEntry(prev => {
            const currentValues = prev.incidentDetails[field];
            const newValues = checked
                ? [...currentValues, value] // Add value if checked
                : currentValues.filter(item => item !== value); // Remove if unchecked
            return {
                ...prev,
                incidentDetails: { ...prev.incidentDetails, [field]: newValues }
            };
        });
    };

    const handleDetailsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewEntry(prev => ({
            ...prev,
            incidentDetails: {
                ...prev.incidentDetails,
                [name]: type === 'checkbox' ? checked : value
            }
        }));
    };


    return (
        <div className="journal-container">
            <div className="journal-header">
                <h1>My Private Journal</h1>
                <div className="journal-actions">
                    <button onClick={() => setIsFormVisible(!isFormVisible)} className="journal-button">
                        {isFormVisible ? 'Cancel' : 'New Entry'}
                    </button>
                    <Link to="/chat" className="journal-button">Back to Chat</Link>
                </div>
            </div>

            {isFormVisible && (
                <form onSubmit={handleSubmit} className="journal-form">
                    <h3>Create New Journal Entry</h3>
                    {error && <p className="journal-error">{error}</p>}
                    
                    {/* --- General Info --- */}
                    <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} placeholder="Title of incident" required />
                    <label>Date of Incident:</label>
                    <input type="date" name="eventDate" value={newEntry.eventDate} onChange={handleInputChange} required />
                    <textarea name="content" value={newEntry.content} onChange={handleInputChange} placeholder="Describe what happened in your own words..." required />

                    {/* --- Incident Details Section --- */}
                    <div className="form-section">
                        <h4>Incident Details</h4>
                        <div className="checkbox-group">
                            <label>Type of Abuse (check all that apply):</label>
                            <div><label><input type="checkbox" value="Physical" onChange={e => handleCheckboxChange(e, 'typeOfAbuse')} /> Physical</label></div>
                            <div><label><input type="checkbox" value="Emotional" onChange={e => handleCheckboxChange(e, 'typeOfAbuse')} /> Emotional / Verbal</label></div>
                            <div><label><input type="checkbox" value="Financial" onChange={e => handleCheckboxChange(e, 'typeOfAbuse')} /> Financial</label></div>
                            <div><label><input type="checkbox" value="Digital" onChange={e => handleCheckboxChange(e, 'typeOfAbuse')} /> Digital / Stalking</label></div>
                        </div>
                        
                        <label className="profile-checkbox-label"><input type="checkbox" name="childrenPresent" checked={newEntry.incidentDetails.childrenPresent} onChange={handleDetailsChange} /> Were children present?</label>
                        <label className="profile-checkbox-label"><input type="checkbox" name="weaponInvolved" checked={newEntry.incidentDetails.weaponInvolved} onChange={handleDetailsChange} /> Was a weapon involved?</label>
                        <label className="profile-checkbox-label"><input type="checkbox" name="injuryOccurred" checked={newEntry.incidentDetails.injuryOccurred} onChange={handleDetailsChange} /> Did an injury occur?</label>
                        
                        {newEntry.incidentDetails.injuryOccurred && (
                            <textarea name="injuryDescription" value={newEntry.incidentDetails.injuryDescription} onChange={handleDetailsChange} placeholder="Describe any injuries..." />
                        )}
                    </div>

                    {/* --- Evidence Section --- */}
                    <div className="form-section">
                        <h4>Evidence</h4>
                        <div className="checkbox-group">
                            <label>Evidence Available (check all that apply):</label>
                            <div><label><input type="checkbox" value="Photos/Videos" onChange={e => handleCheckboxChange(e, 'evidenceAvailable')} /> Photos / Videos</label></div>
                            <div><label><input type="checkbox" value="Recordings" onChange={e => handleCheckboxChange(e, 'evidenceAvailable')} /> Audio Recordings</label></div>
                            <div><label><input type="checkbox" value="Texts/Emails" onChange={e => handleCheckboxChange(e, 'evidenceAvailable')} /> Texts / Emails</label></div>
                            <div><label><input type="checkbox" value="Witnesses" onChange={e => handleCheckboxChange(e, 'evidenceAvailable')} /> Witnesses</label></div>
                        </div>
                        <input type="text" name="policeReportNumber" value={newEntry.incidentDetails.policeReportNumber} onChange={handleDetailsChange} placeholder="Police report number (if any)" />
                    </div>

                    <button type="submit" className="journal-button submit">Save Entry</button>
                </form>
            )}

            <div className="journal-entries">
                <h2>Past Entries</h2>
                {loading && <p>Loading entries...</p>}
                {!loading && entries.length === 0 && <p>You have no journal entries yet.</p>}
                {entries.map(entry => (
                    <div key={entry.entryTimestamp} className="journal-entry">
                        <h3>{entry.title}</h3>
                        <p className="entry-date">Incident Date: {new Date(entry.eventDate).toLocaleDateString()}</p>
                        <p>{entry.content}</p>
                        
                        {/* --- NEW: Displaying the details --- */}
                        <div className="entry-details">
                            {entry.details?.typeOfAbuse?.length > 0 && <p><strong>Abuse Types:</strong> {entry.details.typeOfAbuse.join(', ')}</p>}
                            {entry.details?.childrenPresent && <p><strong>Children Present:</strong> Yes</p>}
                            {entry.details?.weaponInvolved && <p><strong>Weapon Involved:</strong> Yes</p>}
                            {entry.details?.injuryOccurred && <p><strong>Injury Occurred:</strong> Yes</p>}
                            {entry.details?.injuryDescription && <p><strong>Injury Details:</strong> {entry.details.injuryDescription}</p>}
                            {entry.details?.evidenceAvailable?.length > 0 && <p><strong>Evidence:</strong> {entry.details.evidenceAvailable.join(', ')}</p>}
                            {entry.details?.policeReportNumber && <p><strong>Police Report #:</strong> {entry.details.policeReportNumber}</p>}
                        </div>

                        <small className="entry-meta">Logged on: {new Date(entry.entryTimestamp).toLocaleString()}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}