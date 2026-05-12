// src/layouts/AdminLayout.jsx

import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// The paths are updated to point to the new 'components/layout/admin/' folder.
import AdminSidebar from '../components/layout/admin/AdminSidebar';
import AdminBottomNavBar from '../components/layout/admin/AdminBottomNavBar';
import { adminNavigation } from '../config/adminNavigation';

const AdminLayout = () => {
    useAuth();
    const location = useLocation();

    const adminLinks = adminNavigation.flatMap((section) => section.items);
    const isItemActive = (path) => {
        const [pathname, query] = path.split('?');
        if (location.pathname !== pathname) return false;
        if (query) return location.search === `?${query}`;
        return location.search === '';
    };

    return (
        <div className="admin-panel-shell flex min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <AdminSidebar />
            <main className="mobile-smooth-scroll flex-1 pt-16 md:ml-72 md:pt-0">
                <nav className="admin-mobile-rail md:hidden" aria-label="Admin sections">
                    <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
                        {adminLinks.map((item) => {
                            const active = isItemActive(item.path);
                            return (
                                <NavLink
                                    key={`${item.name}-${item.path}`}
                                    to={item.path}
                                    preventScrollReset
                                    className={`rr-filter-chip inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-black transition ${
                                        active
                                            ? 'border-cyan-300 bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                            : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted'
                                    }`}
                                >
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{item.name.replace(' & ', ' ')}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>
                <div className="app-route-surface pb-24 md:pb-0">
                    <Outlet />
                </div>
            </main>
            <AdminBottomNavBar />
        </div>
    );
};

export default AdminLayout;
