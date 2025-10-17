import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ProfilePage.css'; // We will create this CSS file

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('authToken');

    const fetchProfile = useCallback(async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch profile.');
            const data = await response.json();
            setProfile(data.profile);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (e, parent) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [name]: value,
            },
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(profile),
            });
            if (!response.ok) throw new Error('Failed to update profile.');
            setSuccess('Profile submitted successfully! Redirecting to chat...');
            setTimeout(() => {navigate('/chat')}, 3000); // Clear message after 3 seconds
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="profile-loading">Loading Profile...</div>;
    if (error) return <div className="profile-error">Error: {error}</div>;
    if (!profile) return null;

    return (
        <div className="profile-container">
            <form onSubmit={handleSubmit} className="profile-form">
                <h1 className="profile-title">Your Profile</h1>
                <Link to="/chat" className="back-to-chat-link">← Back to Chat</Link>
                
                {success && <p className="profile-success">{success}</p>}

                <div className="profile-section">
                    <h2>Basic Information</h2>
                    <label>Age <input type="number" name="age" value={profile.age || ''} onChange={handleChange} /></label>
                    <label>Gender <input type="text" name="gender" value={profile.gender || ''} onChange={handleChange} /></label>
                    <label>Relationship Status <input type="text" name="relationshipStatus" value={profile.relationshipStatus || ''} onChange={handleChange} /></label>
                </div>

                <div className="profile-section">
                    <h2>Emergency Contact</h2>
                    <label>Name <input type="text" name="name" value={profile.emergencyContact?.name || ''} onChange={(e) => handleNestedChange(e, 'emergencyContact')} /></label>
                    <label>Phone <input type="tel" name="phone" value={profile.emergencyContact?.phone || ''} onChange={(e) => handleNestedChange(e, 'emergencyContact')} /></label>
                    <label>Relationship <input type="text" name="relationship" value={profile.emergencyContact?.relationship || ''} onChange={(e) => handleNestedChange(e, 'emergencyContact')} /></label>
                </div>

                <div className="profile-section">
                    <h2>Safety Plan</h2>
                    <label>Safe Place <input type="text" name="safePlace" value={profile.safetyPlan?.safePlace || ''} onChange={(e) => handleNestedChange(e, 'safetyPlan')} /></label>
                    <label>Coded Message <input type="text" name="codedMessage" value={profile.safetyPlan?.codedMessage || ''} onChange={(e) => handleNestedChange(e, 'safetyPlan')} /></label>
                    <label>Safety Notes <textarea name="notes" value={profile.safetyPlan?.notes || ''} onChange={(e) => handleNestedChange(e, 'safetyPlan')} /></label>
                </div>

                <div className="profile-section">
                    <h2>Children</h2>
                    <label className="profile-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="hasChildren" 
                            checked={profile.children?.hasChildren || false} 
                            onChange={(e) => setProfile(prev => ({ ...prev, children: { ...prev.children, hasChildren: e.target.checked } }))}
                        />
                        Are there children involved?
                    </label>
                    {profile.children?.hasChildren && (
                        <label>Details (e.g., ages, specific concerns)
                            <textarea 
                                name="details" 
                                value={profile.children?.details || ''} 
                                onChange={(e) => handleNestedChange(e, 'children')} 
                            />
                        </label>
                    )}
                </div>

                <div className="profile-section">
                    <h2>Risk Factors</h2>
                    <label className="profile-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="abuserAccessToWeapons" 
                            checked={profile.riskFactors?.abuserAccessToWeapons || false}
                            onChange={(e) => setProfile(prev => ({ ...prev, riskFactors: { ...prev.riskFactors, abuserAccessToWeapons: e.target.checked } }))}
                        />
                        Does the abuser have access to weapons?
                    </label>
                </div>


                <button type="submit" className="profile-save-button">Save Changes</button>
            </form>
        </div>
    );
}