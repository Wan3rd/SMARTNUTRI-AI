import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfiles = async (overrideUser = null) => {
        const currentUser = overrideUser || user;
        if (!currentUser || currentUser.role !== 'parent' || currentUser.force_password_reset) {
            setProfiles([]);
            setSelectedProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await api.get('/profiles');
            
            // Sort profiles by age (Oldest to Youngest) for a stable UI
            const sortedProfiles = [...res.data].sort((a, b) => {
                if (!a.date_of_birth) return 1;
                if (!b.date_of_birth) return -1;
                return new Date(a.date_of_birth) - new Date(b.date_of_birth);
            });

            setProfiles(sortedProfiles);
            
            // Handle initial selection or restoration from localStorage
            const savedId = localStorage.getItem('selectedProfileId');
            const found = res.data.find(p => p.id === savedId);
            
            if (found) {
                setSelectedProfile(found);
            } else if (sortedProfiles.length > 0) {
                setSelectedProfile(sortedProfiles[0]);
                localStorage.setItem('selectedProfileId', sortedProfiles[0].id);
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
