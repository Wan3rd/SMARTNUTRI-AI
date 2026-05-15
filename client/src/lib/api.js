import axios from 'axios';
import config from '@config';

const api = axios.create({
    baseURL: config.server.apiUrl, 
    headers: {},
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle token expiration/invalidity
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || (error.response?.status === 400 && error.response?.data?.message === 'Invalid Token')) {
            localStorage.clear();
            sessionStorage.clear();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        
        // Handle forced password reset requirement
        if (error.response?.status === 403 && error.response?.data?.message === 'FORCE_RESET_REQUIRED') {
            if (window.location.pathname !== '/settings') {
                window.location.href = '/settings?reason=force_reset';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
