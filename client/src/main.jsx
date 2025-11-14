import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

// Import global styles
import './input.css';
import 'tippy.js/dist/tippy.css';
import 'leaflet/dist/leaflet.css';

// --- Core Layouts & Wrappers ---
// Note: We import non-lazy layouts directly.
import RootLayout from './layouts/RootLayout.jsx';
import App from './App.jsx';
import Spinner from './components/common/Spinner.jsx';

// --- Auth Components (Lazy) ---
const ProtectedRoute = lazy(() => import('./components/features/auth/ProtectedRoute.jsx'));
const AdminProtectedRoute = lazy(() => import('./components/features/auth/AdminProtectedRoute.jsx'));

// --- Page Layouts (Lazy) ---
const StudentPagesLayout = lazy(() => import('./layouts/StudentPagesLayout.jsx'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const LandlordProfileLayout = lazy(() => import('./layouts/LandlordProfileLayout.jsx'));

// ▼▼▼ THIS IS THE CORRECTED LINE ▼▼▼
const ProfilePage = lazy(() => import('./layouts/StudentProfileLayout.jsx')); // This is the Student Profile Layout

// --- Page Components (Lazy Loaded) ---

// Student & Public Pages
const HomePage = lazy(() => import('./pages/student/HomePage.jsx'));
const RoomDetailsPage = lazy(() => import('./pages/student/RoomDetailsPage.jsx'));
const WishlistPage = lazy(() => import('./pages/student/WishlistPage.jsx'));
const MyApplicationsPage = lazy(() => import('./pages/student/MyApplicationsPage.jsx'));

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

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminRoomReviewPage = lazy(() => import('./pages/admin/AdminRoomReviewPage.jsx'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage.jsx'));
const RoomManagementPage = lazy(() => import('./pages/admin/RoomManagementPage.jsx'));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage.jsx'));
const AdminUserDetailsPage = lazy(() => import('./pages/admin/AdminUserDetailsPage.jsx'));


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
const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <App />,
                children: [
                    { path: 'login', element: <Suspense fallback={<Spinner />}><AuthPage /></Suspense> },
                    { path: 'signup', element: <Suspense fallback={<Spinner />}><AuthPage /></Suspense> },
                    {
                        // Public routes with student layout
                        element: <Suspense fallback={<Spinner />}><StudentPagesLayout /></Suspense>,
                        children: [
                            { index: true, element: <Suspense fallback={<Spinner />}><HomePage /></Suspense> },
                            { path: 'room/:id', element: <Suspense fallback={<Spinner />}><RoomDetailsPage /></Suspense> },
                            { path: 'rooms', element: <Suspense fallback={<Spinner />}><HomePage /></Suspense> },
                        ]
                    }
                ],
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
                            { path: 'overview', element: <Suspense fallback={<Spinner />}><LandlordOverviewPage /></Suspense> },
                            { path: 'my-rooms', element: <Suspense fallback={<Spinner />}><MyRoomsPage /></Suspense> },
                            { path: 'add-room', element: <Suspense fallback={<Spinner />}><AddRoomPage /></Suspense> },
                            { path: 'edit-room/:id', element: <Suspense fallback={<Spinner />}><AddRoomPage /></Suspense> },
                            { path: 'profile', element: <Suspense fallback={<Spinner />}><LandlordAboutMe /></Suspense> },
                            { path: 'calendar', element: <Suspense fallback={<Spinner />}><LandlordCalendarPage /></Suspense> },
                            { path: 'inbox', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
                            { path: 'inbox/:conversationId', element: <Suspense fallback={<Spinner />}><InboxPage /></Suspense> },
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
                            { path: 'dashboard', element: <Suspense fallback={<Spinner />}><AdminDashboardPage /></Suspense> },
                            { path: 'users', element: <Suspense fallback={<Spinner />}><UserManagementPage /></Suspense> },
                            { path: 'users/:userId', element: <Suspense fallback={<Spinner />}><AdminUserDetailsPage /></Suspense> },
                            { path: 'rooms', element: <Suspense fallback={<Spinner />}><RoomManagementPage /></Suspense> },
                            { path: 'rooms/:id/review', element: <Suspense fallback={<Spinner />}><AdminRoomReviewPage /></Suspense> },
                            { path: 'profile', element: <Suspense fallback={<Spinner />}><AdminProfilePage /></Suspense> },
                        ]
                    }
                ]
            }
        ]
    }
]);

// Render the App 
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <SocketProvider>
                <UIProvider>
                    <Toaster position="top-center" reverseOrder={false} />
                    <RouterProvider router={router} />
                </UIProvider>
            </SocketProvider>
        </AuthProvider>
    </React.StrictMode>
);