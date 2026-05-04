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
                    // If token is invalid or server error, check saved user as fallback or logout
                    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
                    if (savedUser) setUser(JSON.parse(savedUser));
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
            // 1. Register User
            const res = await api.post('/auth/register', {
                email: userData.email?.toLowerCase(),
                password: userData.password,
                full_name: userData.fullName,
                role: userData.role,
                professional_id: userData.professionalId
            });

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

    const updateUser = (updatedUser) => {
        const token = localStorage.getItem('token');
        if (token) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
