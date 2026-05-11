import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ScrollToTop from '../components/common/ScrollToTop';
import Spinner from '../components/common/Spinner';
import MaintenancePage from '../pages/MaintenancePage';
import PWAInstallPrompt from '../components/common/PWAInstallPrompt';
import BottomNavBar from '../components/layout/student/BottomNavBar';
import RoomRadarChatbot from '../components/chatbot/RoomRadarChatbot';
import SmartAppHeader from '../components/layout/mobile/SmartAppHeader';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function RootLayout() {
    const location = useLocation();
    const { user } = useAuth();
    const { settings, loading } = useSettings();
    
    const path = location.pathname;
    const isAuthPath = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/forgot-password');
    const isAdminPath = path.startsWith('/admin');
    const isLandlordPath = path.startsWith('/landlord');
    const isStudentChatDetail = /^\/profile\/inbox\/[^/]+/.test(path);
    const showStudentBottomNav = !isAuthPath
        && !isAdminPath
        && !isLandlordPath
        && !path.startsWith('/list-your-room')
        && !path.startsWith('/loading')
        && !isStudentChatDetail;
    const showAppHeader = !isAuthPath && !path.startsWith('/loading');
    const showInstallPrompt = showAppHeader && !path.includes('/inbox');
    const wrapperClass = showStudentBottomNav ? 'pb-20 md:pb-0' : '';
    const adminRoles = ['Admin', 'Super_Admin', 'Moderator', 'Support'];
    const isAdmin = user?.roles?.some(role => adminRoles.includes(role));

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
            {showAppHeader && <SmartAppHeader />}
            <Outlet />
            {showStudentBottomNav && <BottomNavBar />}
            <RoomRadarChatbot />
            {showInstallPrompt && <PWAInstallPrompt />}
            <ScrollToTop />
        </div>
    );
}

export default RootLayout;
