import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                try {
                    // Always fetch latest user data from server on load to sync status (Approved/Pending)
                    const res = await api.get('/auth/me');
                    setUser(res.data);

                    // Sync storage
                    if (localStorage.getItem('token')) {
                        localStorage.setItem('user', JSON.stringify(res.data));
                    } else {
                        sessionStorage.setItem('user', JSON.stringify(res.data));
                    }
                } catch (err) {
                    console.error("Session sync failed", err);
                    // If account is suspended (403) or token is dead (401), force logout
                    // BUT: Don't logout if it's just a FORCE_RESET_REQUIRED (which is also a 403)
                    const isForceReset = err.response?.data?.message === 'FORCE_RESET_REQUIRED';
                    
                    if (err.response?.status === 401 || (err.response?.status === 403 && !isForceReset)) {
                        logout();
                    } else {
                        // For generic network errors, try falling back to local data to keep UI stable
                        const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
                        if (savedUser) setUser(JSON.parse(savedUser));
                    }
                }
            }
            setLoading(false);
        };

        checkUserLoggedIn();
    }, []);

    const login = async (email, password, rememberMe = false) => {
        try {
            const res = await api.post('/auth/login', {
                email: email?.toLowerCase(),
                password,
                rememberMe
            });

            if (rememberMe) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
            } else {
                sessionStorage.setItem('token', res.data.token);
                sessionStorage.setItem('user', JSON.stringify(res.data.user));
            }

            setUser(res.data.user);
            return { success: true };
        } catch (err) {
            console.error(err);
            return {
                success: false,
                message: err.response?.data?.message || 'Login failed'
            };
        }
    };

    const register = async (userData) => {
        try {
            let data;
            let headers = {};

            if (userData.licenseFile) {
                // Use FormData for multipart/form-data upload
                data = new FormData();
                data.append('email', userData.email?.toLowerCase());
                data.append('password', userData.password);
                data.append('full_name', userData.fullName);
                data.append('role', userData.role);
                data.append('professional_id', userData.professionalId);
                data.append('phone', userData.phone);
                data.append('clinic', userData.clinic);
                data.append('license', userData.licenseFile);
                headers = { 'Content-Type': 'multipart/form-data' };
            } else {
                // Use standard JSON
                data = {
                    email: userData.email?.toLowerCase(),
                    password: userData.password,
                    full_name: userData.fullName,
                    role: userData.role,
                    professional_id: userData.professionalId,
                    phone: userData.phone,
                    clinic: userData.clinic
                };
            }

            // 1. Register User
            const res = await api.post('/auth/register', data, { headers });

            const { token, user: newUser } = res.data;

            // Default register behavior: Login persistently (or we could choose session)
            // Let's stick to localStorage for better UX after registration
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(newUser));
            setUser(newUser);

            return { success: true };
        } catch (err) {
            console.error(err);
            return {
                success: false,
                message: err.response?.data?.message || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    function updateUser(updatedUser) {
        const token = localStorage.getItem('token');
        if (token) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setUser(updatedUser);
    }

    const updatePreferences = async (prefs) => {
        try {
            await api.put('/auth/preferences', prefs);
            const updatedUser = { ...user };
            if (prefs.theme) updatedUser.theme_preference = prefs.theme;
            if (prefs.privacy_mode !== undefined) updatedUser.privacy_mode = prefs.privacy_mode;
            if (prefs.measurement_system) updatedUser.measurement_system = prefs.measurement_system;
            if (prefs.nutrient_precision) updatedUser.nutrient_precision = prefs.nutrient_precision;
            if (prefs.notif_compliance !== undefined) updatedUser.notif_compliance = prefs.notif_compliance;
            if (prefs.notif_reminders !== undefined) updatedUser.notif_reminders = prefs.notif_reminders;
            if (prefs.research_anonymize !== undefined) updatedUser.research_anonymize = prefs.research_anonymize;
            
            updateUser(updatedUser);
            return { success: true };
        } catch (err) {
            console.error("Failed to update preferences", err);
            return { success: false };
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updatePreferences }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
