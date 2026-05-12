import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ScrollToTop from '../components/common/ScrollToTop';
import Spinner from '../components/common/Spinner';
import MaintenancePage from '../pages/MaintenancePage';
import PWAInstallPrompt from '../components/common/PWAInstallPrompt';
import TabScrollRestoration from '../components/common/TabScrollRestoration';
import BottomNavBar from '../components/layout/student/BottomNavBar';
import SmartAppHeader from '../components/layout/mobile/SmartAppHeader';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const RoomRadarChatbot = lazy(() => import('../components/chatbot/RoomRadarChatbot'));

function RootLayout() {
    const location = useLocation();
    const { user } = useAuth();
    const { settings, loading } = useSettings();
    
    const path = location.pathname;
    const isAuthPath = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/forgot-password');
    const isAdminPath = path.startsWith('/admin');
    const isLandlordPath = path.startsWith('/landlord');
    const isStudentChatDetail = /^\/profile\/inbox\/[^/]+/.test(path);
    const isRoomFlow = /^\/room\/[^/]+(?:\/book)?\/?$/.test(path);
    const showStudentBottomNav = !isAuthPath
        && !isAdminPath
        && !isLandlordPath
        && !path.startsWith('/list-your-room')
        && !path.startsWith('/loading')
        && !isStudentChatDetail;
    const showAppHeader = !isAuthPath && !path.startsWith('/loading');
    const showInstallPrompt = showAppHeader && !path.includes('/inbox') && !isRoomFlow;
    const showChatbot = showInstallPrompt
        && !/^\/landlord\/(?:add-room|edit-room\/[^/]+)\/?$/.test(path);
    const wrapperClass = showStudentBottomNav ? 'pb-[calc(var(--rr-bottom-nav-height)+1rem)] md:pb-0' : '';
    const adminRoles = ['Admin', 'Super_Admin', 'Moderator', 'Support'];
    const isAdmin = user?.roles?.some(role => adminRoles.includes(role));
    const [chatbotReady, setChatbotReady] = useState(false);

    useEffect(() => {
        if (!showChatbot) {
            setChatbotReady(false);
            return undefined;
        }

        const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1200));
        const cancel = window.cancelIdleCallback || window.clearTimeout;
        const handle = schedule(() => setChatbotReady(true));

        return () => cancel(handle);
    }, [showChatbot]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-light-bg dark:bg-dark-bg">
                <Spinner />
            </div>
        );
    }

    if (settings?.maintenanceMode && !isAdmin && !isAuthPath) {
        return <MaintenancePage settings={settings} />;
    }

    return (
        <div className={`app-route-surface min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text ${wrapperClass}`}>
            <TabScrollRestoration />
            {showAppHeader && <SmartAppHeader />}
            <Outlet />
            {showStudentBottomNav && <BottomNavBar />}
            {chatbotReady && (
                <Suspense fallback={null}>
                    <RoomRadarChatbot />
                </Suspense>
            )}
            {showInstallPrompt && <PWAInstallPrompt />}
            <ScrollToTop />
        </div>
    );
}

export default RootLayout;
