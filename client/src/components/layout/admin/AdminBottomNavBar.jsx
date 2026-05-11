import React from 'react';
import { BarChart3, Gauge, Home, Settings, Users } from 'lucide-react';
import MobileBottomNav from '../mobile/MobileBottomNav';

const AdminBottomNavBar = () => {
    const navItems = [
        { path: '/admin/dashboard', Icon: Gauge, label: 'Home', end: true },
        { path: '/admin/analytics', Icon: BarChart3, label: 'Reports' },
        { path: '/admin/users', Icon: Users, label: 'Users' },
        { path: '/admin/rooms', Icon: Home, label: 'Rooms' },
        { path: '/admin/settings', Icon: Settings, label: 'Settings' },
    ];

    return <MobileBottomNav items={navItems} variant="admin" />;
};

export default AdminBottomNavBar;
