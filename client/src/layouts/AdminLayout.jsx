// src/layouts/AdminLayout.jsx

import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// The paths are updated to point to the new 'components/layout/admin/' folder.
import AdminSidebar from '../components/layout/admin/AdminSidebar';
import AdminBottomNavBar from '../components/layout/admin/AdminBottomNavBar';
import { adminNavigation, formatAdminBadgeCount, getAdminNavigationBadge } from '../config/adminNavigation';
import { canAccessAdminItem, canAccessAdminPath, describeAdminPermission, getAdminPermissionForPath } from '../utils/adminPermissions';
import { prefetchRoute } from '../utils/routePrefetch';
import RouteTransition from '../components/common/RouteTransition';

const getMobileAdminLabel = (name) => ({
    'Analytics & Reports': 'Reports',
    'User Management': 'Users',
    'Landlord Hub': 'Landlords',
    'KYC & Verifications': 'KYC',
    'All Rooms': 'Rooms',
    'Pending Approvals': 'Pending',
    'Revenue & Commission': 'Revenue',
    'Support Tickets': 'Tickets',
    'System Logs': 'Logs',
}[name] || name);

const AdminLayout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [adminCounts, setAdminCounts] = useState({});

    const adminLinks = adminNavigation.flatMap((section) => section.items).filter((item) => canAccessAdminItem(user, item));
    const requiredPermission = getAdminPermissionForPath(location.pathname, location.search);
    const canAccessCurrentPath = canAccessAdminPath(user, location.pathname, location.search);
    const isItemActive = (path) => {
        const [pathname, query] = path.split('?');
        if (location.pathname !== pathname) return false;
        if (query) return location.search === `?${query}`;
        return location.search === '';
    };

    const refreshAdminCounts = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats');
            setAdminCounts({
                totalUsers: data?.totalUsers || 0,
                totalLandlords: data?.totalLandlords || 0,
                totalRooms: data?.totalRooms || 0,
                pendingRoomsCount: data?.pendingRoomsCount || 0,
                supportOpenCount: data?.supportOpenCount || 0,
                urgentSupportTicketsCount: data?.urgentSupportTicketsCount || 0,
                pendingKycUsersCount: data?.pendingKycUsersCount || 0,
                restrictedAccountsCount: data?.restrictedAccountsCount || 0,
                urgentOpsCount: data?.urgentOpsCount || 0,
            });
        } catch {
            setAdminCounts((current) => current);
        }
    }, []);

    useEffect(() => {
        refreshAdminCounts();
        window.addEventListener('roomradar:admin-counts-refresh', refreshAdminCounts);

        return () => window.removeEventListener('roomradar:admin-counts-refresh', refreshAdminCounts);
    }, [refreshAdminCounts]);

    return (
        <div className="admin-panel-shell flex min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <AdminSidebar counts={adminCounts} />
            <main className="mobile-smooth-scroll flex-1 pt-16 md:ml-72 md:pt-0">
                <nav className="admin-mobile-rail md:hidden" aria-label="Admin sections">
                    <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
                        {adminLinks.map((item) => {
                            const active = isItemActive(item.path);
                            const badge = getAdminNavigationBadge(item, adminCounts);
                            return (
                                <NavLink
                                    key={`${item.name}-${item.path}`}
                                    to={item.path}
                                    preventScrollReset
                                    onPointerDown={() => prefetchRoute(item.path)}
                                    onFocus={() => prefetchRoute(item.path)}
                                    className={`admin-mobile-chip relative inline-flex h-10 min-h-10 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-black leading-none transition ${
                                        active
                                            ? 'border-cyan-300 bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                            : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted'
                                    }`}
                                >
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{getMobileAdminLabel(item.name)}</span>
                                    {badge > 0 && (
                                        <span className={`absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-black leading-none ${
                                            active
                                                ? 'bg-white text-cyan-600'
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {formatAdminBadgeCount(badge)}
                                        </span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>
                <div className="app-route-surface rr-flat-mobile-pages pb-24 md:pb-0">
                    {canAccessCurrentPath ? (
                        <RouteTransition />
                    ) : (
                        <div className="min-h-[calc(100vh-var(--rr-nav-height))] bg-light-bg px-4 py-6 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 lg:px-8">
                            <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-light-border bg-light-card p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-card">
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                                    <ShieldAlert className="h-7 w-7" />
                                </span>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Permission required</p>
                                <h1 className="mt-2 text-2xl font-black">This admin section is restricted</h1>
                                <p className="mt-3 max-w-lg text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                                    Your current admin role does not include {describeAdminPermission(requiredPermission)}. Ask a Super Admin or Admin to update your RBAC role if you need this workflow.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <AdminBottomNavBar counts={adminCounts} />
        </div>
    );
};

export default AdminLayout;
