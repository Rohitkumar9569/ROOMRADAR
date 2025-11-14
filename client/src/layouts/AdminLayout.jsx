// src/layouts/AdminLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';

// The paths are updated to point to the new 'components/layout/admin/' folder.
import AdminSidebar from '../components/layout/admin/AdminSidebar';
import AdminBottomNavBar from '../components/layout/admin/AdminBottomNavBar';

const AdminLayout = () => {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <AdminSidebar />
            <main className="flex-1 md:ml-64"> {/* Adjust margin-left to match sidebar width */}
                <div className="pb-16 md:pb-0"> {/* Add padding to bottom to avoid overlap with mobile nav */}
                    <Outlet />
                </div>
            </main>
            <AdminBottomNavBar />
        </div>
    );
};

export default AdminLayout;