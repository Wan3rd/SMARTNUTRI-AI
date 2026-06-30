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
            const currentPath = window.location.pathname;
            const isBypassPath = ['/login', '/register', '/onboarding'].some(path => currentPath === path || currentPath.startsWith(path + '/'));
            if (!isBypassPath) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
            }
        }
        
        // Handle forced password reset requirement
        if (error.response?.status === 403 && error.response?.data?.message === 'FORCE_RESET_REQUIRED') {
            if (window.location.pathname !== '/settings') {
                window.location.href = '/settings?reason=force_reset';
            }
        }

        // Handle maintenance mode (server returns 503 with maintenance:true)
        if (error.response?.status === 503 && error.response?.data?.maintenance === true) {
            if (window.location.pathname !== '/maintenance') {
                window.location.href = '/maintenance';
            }
        }

        // 429 Rate Limit — let each page's catch block display err.response?.data?.message
        // (e.g. "Too many login attempts. Please try again in 15 minutes.")
        // No global redirect needed; just propagate the error normally.

        return Promise.reject(error);
    }
);

export default api;
