import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Force Password Reset Check - Normalize path to avoid loops
    const currentPath = location.pathname.replace(/\/$/, "");
    if (user.force_password_reset && currentPath !== '/force-password-reset') {
        return <Navigate to="/force-password-reset" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to their appropriate dashboard if role doesn't match
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'nutritionist' && user.status !== 'approved') {
        // Redirect to their appropriate dashboard if nutritionist is not approved
        return <Navigate to="/" replace />;
    }

    // Lock down pending nutritionists: allow only permitted routes (root, meals, profile, settings, and force-password-reset)
    if (user.role === 'nutritionist' && user.status !== 'approved') {
        const allowedPaths = ['', '/dashboard', '/meals', '/profile', '/settings', '/force-password-reset'];
        const isAllowed = allowedPaths.some(allowed => currentPath === allowed || currentPath.startsWith('/meals/'));
        if (!isAllowed) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
}
