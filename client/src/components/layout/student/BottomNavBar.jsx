import React from 'react';
import { useSocket } from '../../../context/SocketContext';
import { CalendarCheck, Compass, Heart, MessageCircle, Search } from 'lucide-react';
import MobileBottomNav from '../mobile/MobileBottomNav';

const BottomNavBar = React.memo(function BottomNavBar({ hidden = false }) {
    const { unreadNotificationCount = 0 } = useSocket() || {};

    const navItems = [
        { path: '/', label: 'Explore', Icon: Compass, protected: false, count: 0, end: true },
        { path: '/rooms', label: 'Search', Icon: Search, protected: false, count: 0 },
        { path: '/profile/wishlist', label: 'Saved', Icon: Heart, protected: true, count: 0 },
        { path: '/profile/inbox', label: 'Inbox', Icon: MessageCircle, protected: true, count: unreadNotificationCount },
        { path: '/profile/my-applications', label: 'Trips', Icon: CalendarCheck, protected: true, count: 0 },
    ];

    return <MobileBottomNav items={navItems} hidden={hidden} variant="student" />;
});

export default BottomNavBar;
