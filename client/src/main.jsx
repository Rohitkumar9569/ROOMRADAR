import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Auth imports
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { UIProvider } from './context/UIContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'

// Import global styles
import './input.css'
import 'tippy.js/dist/tippy.css'

const applyInitialThemeMode = () => {
    try {
        const savedTheme = window.localStorage.getItem('theme-preference') || window.localStorage.getItem('theme');
        const themePreference = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'system';
        const isDarkMode = themePreference === 'dark'
            || (themePreference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', Boolean(isDarkMode));
        document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
            meta.setAttribute('content', isDarkMode ? '#0f0f0f' : '#ffffff');
        });
    } catch {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }
};

applyInitialThemeMode();

const setupPWAInstallEventCapture = () => {
    if (typeof window === 'undefined' || window.__roomRadarInstallCaptureReady) return;
    window.__roomRadarInstallCaptureReady = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        window.roomRadarDeferredInstallPrompt = event;
        window.dispatchEvent(new Event('roomradar:pwa-install-ready'));
    });

    window.addEventListener('appinstalled', () => {
        window.roomRadarDeferredInstallPrompt = null;
        window.dispatchEvent(new Event('roomradar:pwa-installed'));
    });
};

setupPWAInstallEventCapture();

// Set instant scroll behavior globally
document.documentElement.style.scrollBehavior = 'auto';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // PWA registration is an enhancement; routing and app boot should never depend on it.
        });
    });
}

// Keep tab switches and revisits feeling instant instead of refetching visible data immediately.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// --- Core Layouts & Wrappers ---
// Note: We import non-lazy layouts directly.
import RootLayout from './layouts/RootLayout.jsx';
import App from './App.jsx';
import DelayedRouteLoader from './components/common/DelayedRouteLoader.jsx';

const Spinner = DelayedRouteLoader;
const ReactQueryDevtoolsPanel = import.meta.env.DEV
    ? lazy(() => import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => ({ default: ReactQueryDevtools })))
    : null;

// --- Auth Components (Lazy) ---
const ProtectedRoute = lazy(() => import('./components/features/auth/ProtectedRoute.jsx'));
const AdminProtectedRoute = lazy(() => import('./components/features/auth/AdminProtectedRoute.jsx'));

// --- Page Layouts (Lazy) ---
const StudentPagesLayout = lazy(() => import('./layouts/StudentPagesLayout.jsx'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const LandlordProfileLayout = lazy(() => import('./layouts/LandlordProfileLayout.jsx'));
const ProfilePage = lazy(() => import('./layouts/StudentProfileLayout.jsx'));

// --- Page Components (Lazy Loaded) ---

// Student & Public Pages
const HomePage = lazy(() => import('./pages/student/HomePage.jsx'));
const SearchPage = lazy(() => import('./pages/student/SearchPage.jsx'));
const RoomDetailsPage = lazy(() => import('./pages/student/RoomDetailsPage.jsx'));
const BookingPage = lazy(() => import('./pages/student/BookingPage.jsx'));
const WishlistPage = lazy(() => import('./pages/student/WishlistPage.jsx'));
const MyApplicationsPage = lazy(() => import('./pages/student/MyApplicationsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/404Page.jsx'));
const LoadingPage = lazy(() => import('./pages/LoadingPage.jsx'));

// Premium Student Pages
const OverviewPage = lazy(() => import('./pages/student/OverviewPage.jsx'));
const PaymentPage = lazy(() => import('./pages/student/PaymentPage.jsx'));
const RentalAgreementPage = lazy(() => import('./pages/student/RentalAgreementPage.jsx'));
const ReportDamagesPage = lazy(() => import('./pages/student/ReportDamagesPage.jsx'));

// Auth Pages
const AuthPage = lazy(() => import('./pages/auth/AuthPage.jsx'));

// Shared Pages
const InboxPage = lazy(() => import('./pages/inbox/InboxPage.jsx'));

// Student Profile Pages (Index Routes)
const AboutMe = lazy(() => import('./components/features/profile/AboutMe.jsx'));

// Landlord Pages
const LandlordOverviewPage = lazy(() => import('./pages/landlord/LandlordOverviewPage.jsx'));
const MyRoomsPage = lazy(() => import('./pages/landlord/MyRoomsPage.jsx'));
const AddRoomPage = lazy(() => import('./pages/landlord/AddRoomPage.jsx'));
const LandlordAboutMe = lazy(() => import('./components/features/profile/LandlordAboutMe.jsx'));
const LandlordCalendarPage = lazy(() => import('./pages/landlord/LandlordCalendarPage.jsx'));
const LandlordInsightsPage = lazy(() => import('./pages/landlord/LandlordInsightsPage.jsx'));
const LandlordApplicationsPage = lazy(() => import('./pages/landlord/LandlordApplicationsPage.jsx'));

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminRoomReviewPage = lazy(() => import('./pages/admin/AdminRoomReviewPage.jsx'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage.jsx'));
const RoomManagementPage = lazy(() => import('./pages/admin/RoomManagementPage.jsx'));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage.jsx'));
const AdminUserDetailsPage = lazy(() => import('./pages/admin/AdminUserDetailsPage.jsx'));
const AdminInsightsPage = lazy(() => import('./pages/admin/AdminInsightsPage.jsx'));


// --- Helper component to redirect Landlords away from student profile ---
const ProfileGate = () => {
    const { user, activeRole } = useAuth();
    if (user?.roles?.includes('Landlord') && activeRole === 'landlord') {
        return <Navigate to="/landlord/overview" replace />;
    }
    // ProfilePage is the layout, which contains the <Outlet />
    return <Suspense fallback={<Spinner />}><ProfilePage /></Suspense>;
};

// Router Configuration
const router = createBrowserRouter(
    [
        {
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <App />,
                children: [
                    { path: 'login', element: <Suspense fallback={<Spinner />}><AuthPage /></Suspense> },
                    { path: 'signup', element: <Suspense fallback={<Spinner />}><AuthPage /></Suspense> },
                    { path: 'loading', element: <Suspense fallback={<Spinner />}><LoadingPage /></Suspense> },
                    {
                        // Public routes with student layout
                        element: <Suspense fallback={<Spinner />}><StudentPagesLayout /></Suspense>,
                        children: [
                            { index: true, element: <Suspense fallback={<Spinner />}><HomePage /></Suspense> },
                            { path: 'room/:id', element: <Suspense fallback={<Spinner />}><RoomDetailsPage /></Suspense> },
                            { path: 'rooms', element: <Suspense fallback={<Spinner />}><SearchPage /></Suspense> },
                        ]
                    }
                ],
            },
            {
                path: 'room/:id/book',
                element: <Suspense fallback={<Spinner />}><ProtectedRoute allowedRoles={['Student', 'Landlord']} /></Suspense>,
                children: [
                    {
                        element: <Suspense fallback={<Spinner />}><StudentPagesLayout /></Suspense>,
                        children: [{ index: true, element: <Suspense fallback={<Spinner />}><BookingPage /></Suspense> }]
                    }
                ]
            },
            {
                // Standalone page, protected for students/landlords
                path: 'list-your-room',
                element: <Suspense fallback={<Spinner />}><ProtectedRoute allowedRoles={['Student', 'Landlord']} /></Suspense>,
                children: [{ index: true, element: <Suspense fallback={<Spinner />}><AddRoomPage /></Suspense> }]
            },
            {
                // Student Profile section
                path: 'profile',
                element: <Suspense fallback={<Spinner />}><ProtectedRoute allowedRoles={['Student', 'Landlord']} /></Suspense>,
                children: [
                    {
                        element: <Suspense fallback={<Spinner />}><StudentPagesLayout /></Suspense>,
                        children: [
                            {
                                element: <ProfileGate />, // Handles redirect logic
                                children: [
                                    { index: true, element: <Suspense fallback={<Spinner />}><AboutMe /></Suspense> },
                                    { path: 'about-me', element: <Suspense fallback={<Spinner />}><AboutMe /></Suspense> },
                                    { path: 'my-applications', element: <Suspense fallback={<Spinner />}><MyApplicationsPage /></Suspense> },
                                    { path: 'wishlist', element: <Suspense fallback={<Spinner />}><WishlistPage /></Suspense> },
                                    { path: 'inbox', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
                                    { path: 'inbox/:conversationId', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
                                    // Premium Features
                                    { path: 'overview', element: <Suspense fallback={<Spinner />}><OverviewPage /></Suspense> },
                                    { path: 'payment/:applicationId', element: <Suspense fallback={<Spinner />}><PaymentPage /></Suspense> },
                                    { path: 'agreement/:applicationId', element: <Suspense fallback={<Spinner />}><RentalAgreementPage /></Suspense> },
                                    { path: 'report-damage/:applicationId', element: <Suspense fallback={<Spinner />}><ReportDamagesPage /></Suspense> },
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                // Landlord section
                path: 'landlord',
                element: <Suspense fallback={<Spinner />}><ProtectedRoute allowedRoles={['Landlord']} /></Suspense>,
                children: [
                    {
                        element: <Suspense fallback={<Spinner />}><LandlordProfileLayout /></Suspense>,
                        children: [
                            { index: true, element: <Navigate to="overview" replace /> },
                            { path: 'overview', element: <Suspense fallback={<Spinner />}><LandlordOverviewPage /></Suspense> },
                            { path: 'my-rooms', element: <Suspense fallback={<Spinner />}><MyRoomsPage /></Suspense> },
                            { path: 'add-room', element: <Suspense fallback={<Spinner />}><AddRoomPage /></Suspense> },
                            { path: 'edit-room/:id', element: <Suspense fallback={<Spinner />}><AddRoomPage /></Suspense> },
                            { path: 'profile', element: <Suspense fallback={<Spinner />}><LandlordAboutMe /></Suspense> },
                            { path: 'calendar', element: <Suspense fallback={<Spinner />}><LandlordCalendarPage /></Suspense> },
                            { path: 'applications', element: <Suspense fallback={<Spinner />}><LandlordApplicationsPage /></Suspense> },
                            { path: 'agreement/:applicationId', element: <Suspense fallback={<Spinner />}><RentalAgreementPage /></Suspense> },
                            { path: 'inbox', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
                            { path: 'inbox/:conversationId', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
                            // Premium Feature
                            { path: 'insights', element: <Suspense fallback={<Spinner />}><LandlordInsightsPage /></Suspense> },
                        ]
                    }
                ]
            },
            {
                // Admin section
                path: 'admin',
                element: <Suspense fallback={<Spinner />}><AdminProtectedRoute /></Suspense>,
                children: [
                    {
                        element: <Suspense fallback={<Spinner />}><AdminLayout /></Suspense>,
                        children: [
                            { index: true, element: <Navigate to="dashboard" replace /> },
                            { path: 'dashboard', element: <Suspense fallback={<Spinner />}><AdminDashboardPage /></Suspense> },
                            { path: 'analytics', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="analytics" /></Suspense> },
                            { path: 'users', element: <Suspense fallback={<Spinner />}><UserManagementPage /></Suspense> },
                            { path: 'users/:userId', element: <Suspense fallback={<Spinner />}><AdminUserDetailsPage /></Suspense> },
                            { path: 'rooms', element: <Suspense fallback={<Spinner />}><RoomManagementPage /></Suspense> },
                            { path: 'rooms/:id/review', element: <Suspense fallback={<Spinner />}><AdminRoomReviewPage /></Suspense> },
                            { path: 'verifications', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="verifications" /></Suspense> },
                            { path: 'revenue', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="revenue" /></Suspense> },
                            { path: 'tickets', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="tickets" /></Suspense> },
                            { path: 'logs', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="logs" /></Suspense> },
                            { path: 'settings', element: <Suspense fallback={<Spinner />}><AdminInsightsPage section="settings" /></Suspense> },
                            { path: 'profile', element: <Suspense fallback={<Spinner />}><AdminProfilePage /></Suspense> },
                        ]
                    }
                ]
            },
            { path: '*', element: <Suspense fallback={<Spinner />}><NotFoundPage /></Suspense> }
        ]
        }
    ],
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        },
    }
);

// Render the App 
ReactDOM.createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <React.StrictMode>
                <ThemeProvider>
                    <AuthProvider>
                        <SettingsProvider>
                            <SocketProvider>
                                <UIProvider>
                                    <Toaster
                                        position="top-center"
                                        reverseOrder={false}
                                        gutter={10}
                                        toastOptions={{
                                            duration: 3600,
                                            success: { duration: 2600 },
                                            error: { duration: 5200 },
                                            loading: { duration: 12000 },
                                            custom: { duration: 6500 },
                                            style: {
                                                maxWidth: 'min(92vw, 420px)',
                                                borderRadius: '16px',
                                                fontWeight: 700,
                                            },
                                        }}
                                    />
                                    <RouterProvider router={router} future={{ v7_startTransition: true }} />
                                </UIProvider>
                            </SocketProvider>
                        </SettingsProvider>
                    </AuthProvider>
                </ThemeProvider>
            </React.StrictMode>
        </GoogleOAuthProvider>
        {ReactQueryDevtoolsPanel && (
            <Suspense fallback={null}>
                <ReactQueryDevtoolsPanel initialIsOpen={false} />
            </Suspense>
        )}
    </QueryClientProvider>
);
