import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfiles = async () => {
        if (!user || user.role !== 'parent') {
            setProfiles([]);
            setSelectedProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await api.get('/profiles');
            setProfiles(res.data);
            
            // Handle initial selection or restoration from localStorage
            const savedId = localStorage.getItem('selectedProfileId');
            const found = res.data.find(p => p.id === savedId);
            
            if (found) {
                setSelectedProfile(found);
            } else if (res.data.length > 0) {
                setSelectedProfile(res.data[0]);
                localStorage.setItem('selectedProfileId', res.data[0].id);
            } else {
                setSelectedProfile(null);
            }
        } catch (err) {
            console.error("Failed to fetch profiles in context", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfiles();
    }, [user]);

    const selectProfile = (profileId) => {
        const found = profiles.find(p => p.id === profileId);
        if (found) {
            setSelectedProfile(found);
            localStorage.setItem('selectedProfileId', profileId);
        }
    };

    return (
        <ProfileContext.Provider value={{ 
            profiles, 
            selectedProfile, 
            selectProfile, 
            refreshProfiles,
            loading 
        }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};
