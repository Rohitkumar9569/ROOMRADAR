import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Mail, PlusCircle, User } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useUI } from '../context/UIContext';
import LandlordProfileSidebar from '../components/layout/landlord/LandlordProfileSidebar';
import MobileBottomNav from '../components/layout/mobile/MobileBottomNav';

const landlordNavItems = [
    { path: '/landlord/overview', label: 'Today', Icon: LayoutDashboard, activePrefixes: ['/landlord/overview', '/landlord/calendar', '/landlord/applications'] },
    { path: '/landlord/my-rooms', label: 'Listings', Icon: List },
    { path: '/landlord/add-room', label: 'Add', Icon: PlusCircle, center: true, ariaLabel: 'Add room' },
    { path: '/landlord/inbox', label: 'Inbox', Icon: Mail, badge: true },
    { path: '/landlord/profile', label: 'Me', Icon: User, end: true, avatar: true },
];

const LandlordProfileLayout = () => {
    const mainContentRef = useRef(null);
    const location = useLocation();
    const { unreadNotificationCount } = useSocket();
    const {
        isSidebarOpen,
        headerSearchTerm,
        setHeaderSearchTerm,
        setActiveChatMeta,
        setChatProfileOpen,
        inboxListScrolled,
        setInboxListScrolled,
    } = useUI();
    const [selectedRoomId, setSelectedRoomId] = useState('all');

    useEffect(() => {
        setHeaderSearchTerm('');
        setSelectedRoomId('all');
        setInboxListScrolled(false);
        setChatProfileOpen(false);
        setActiveChatMeta((prev) => (prev ? null : prev));
    }, [location.pathname, setActiveChatMeta, setChatProfileOpen, setHeaderSearchTerm, setInboxListScrolled]);

    const isInboxPage = location.pathname.includes('/inbox');
    const isOverviewPage = location.pathname === '/landlord/overview';
    const isChatOpen = isInboxPage && /\/inbox\/[^/]+/.test(location.pathname);
    const inboxCount = unreadNotificationCount || 0;

    const setActiveChatName = useCallback((name) => {
        setActiveChatMeta((prev) => {
            const next = name ? { ...(prev || {}), name } : null;
            if (!next && !prev) return prev;
            if (next && prev?.name === next.name) return prev;
            return next;
        });
    }, [setActiveChatMeta]);

    const outletContext = useMemo(() => ({
        searchTerm: headerSearchTerm,
        setSearchTerm: setHeaderSearchTerm,
        setActiveChatMeta,
        setActiveChatName,
        selectedRoomId,
        setSelectedRoomId,
        inboxSearchInNav: inboxListScrolled,
        setInboxListScrolled,
    }), [
        headerSearchTerm,
        setHeaderSearchTerm,
        setActiveChatMeta,
        setActiveChatName,
        selectedRoomId,
        inboxListScrolled,
        setInboxListScrolled,
    ]);
    const mainContentMargin = isSidebarOpen ? 'md:ml-72' : 'md:ml-24';
    const bottomItems = landlordNavItems.map((item) => (
        item.badge ? { ...item, count: inboxCount } : item
    ));
    const mainTopPadding = isInboxPage ? 'mobile-inbox-main' : 'pt-16 md:pt-0';

    return (
        <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <LandlordProfileSidebar />
            <main ref={mainContentRef} className={`mobile-smooth-scroll min-h-screen transition-all duration-300 md:pb-0 ${mainTopPadding} ${isInboxPage ? 'pb-0' : 'pb-24'} ${mainContentMargin}`}>
                <div className={
                    isInboxPage
                        ? 'mobile-inbox-page-shell md:pt-0'
                        : isOverviewPage
                            ? 'md:p-6 lg:p-8'
                            : 'app-route-surface px-2 pb-4 sm:p-6 lg:p-8'
                }>
                    <Outlet context={outletContext} />
                </div>
            </main>

            <MobileBottomNav items={bottomItems} currentPath={location.pathname} hidden={isChatOpen} variant="landlord" />
        </div>
    );
};

export default LandlordProfileLayout;
