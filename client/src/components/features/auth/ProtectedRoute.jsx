import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../common/Spinner';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthLoading } = useAuth();
    const location = useLocation();

    // While checking the user's login status, show a spinner
    if (isAuthLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner />
            </div>
        );
    }

    // If loading is finished and there's no user, redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // --- [CHANGED] This is the updated role check ---
    // It now checks if the user's roles array has at least one of the allowed roles
    const hasRequiredRole = user.roles && user.roles.some(role => allowedRoles.includes(role));

    if (allowedRoles && !hasRequiredRole) {
        // If the user does not have the required role, redirect to the homepage
        return <Navigate to="/" replace />;
    }

    // If all checks pass, show the page
    return <Outlet />;
};

export default ProtectedRoute;