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

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to their appropriate dashboard if role doesn't match
        return <Navigate to="/" replace />;
    }

    // Force Password Reset Check - Normalize path to avoid loops
    const currentPath = location.pathname.replace(/\/$/, "");
    if (user.force_password_reset && currentPath !== '/force-password-reset') {
        return <Navigate to="/force-password-reset" replace />;
    }

    return children;
}
