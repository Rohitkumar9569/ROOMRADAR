import React from 'react';
import { BarChart3, Gauge, Headphones, Home, Users } from 'lucide-react';
import MobileBottomNav from '../mobile/MobileBottomNav';
import { useAuth } from '../../../context/AuthContext';
import { canAccessAdminItem } from '../../../utils/adminPermissions';

const AdminBottomNavBar = ({ counts = {} }) => {
    const { user } = useAuth();
    const ticketBadge = Number(counts.urgentSupportTicketsCount || counts.supportOpenCount || 0);

    const navItems = [
        { path: '/admin/dashboard', Icon: Gauge, label: 'Home', end: true, permission: 'dashboard:view' },
        {
            path: '/admin/analytics',
            Icon: BarChart3,
            label: 'Reports',
            activePrefixes: ['/admin/analytics', '/admin/revenue', '/admin/verifications', '/admin/logs'],
            permission: 'analytics:view',
        },
        { path: '/admin/users', Icon: Users, label: 'Users', activePrefixes: ['/admin/users'], permission: 'users:view' },
        { path: '/admin/rooms', Icon: Home, label: 'Rooms', activePrefixes: ['/admin/rooms'], count: counts.pendingRoomsCount || 0, permission: 'rooms:view' },
        { path: '/admin/tickets', Icon: Headphones, label: 'Tickets', activePrefixes: ['/admin/tickets'], count: ticketBadge, permission: 'tickets:manage' },
    ].filter((item) => canAccessAdminItem(user, item));

    return <MobileBottomNav items={navItems} variant="admin" />;
};

export default AdminBottomNavBar;
