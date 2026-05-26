// client/src/components/AdminProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../common/Spinner';


const AdminProtectedRoute = () => {
    // 1. Use 'isAuthLoading' from your context for consistency
    const { user, isAuthLoading } = useAuth();
    const location = useLocation();

    if (isAuthLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const adminRoles = ['Admin', 'Super_Admin', 'Moderator', 'Support'];
    const isAdmin = user?.roles?.some(role => adminRoles.includes(role));

    return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminProtectedRoute;
