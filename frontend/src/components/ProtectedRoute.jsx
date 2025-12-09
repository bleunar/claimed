import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-4">Loading...</div>; // Or a spinner
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User not authorized
        return <Navigate to="/dashboard" replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
