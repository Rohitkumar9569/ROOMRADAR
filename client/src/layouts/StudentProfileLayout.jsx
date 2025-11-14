// src/layouts/StudentProfileLayout.jsx (or ProfilePage.jsx)

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/layout/student/ProfileSidebar'; // Corrected path
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// --- Header Sub-components (FIXED) ---

const InboxHeaderSearch = ({ searchTerm, setSearchTerm }) => (
    // [FIX 1] Removed 'max-w-xs' to allow full width on mobile
    <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
            type="text"
            placeholder="Search by name or room..."
            className="w-full pl-10 p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
    </div>
);

// (ApplicationsHeaderSearch is unchanged)
const ApplicationsHeaderSearch = ({ searchTerm, setSearchTerm }) => (
    <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
            type="text"
            placeholder="Search by room or landlord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-full border-0 bg-white py-2.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
        />
    </div>
);

// (FilterTabs is unchanged)
const FilterTabs = ({ tabs, counts, activeFilter, onFilterChange, marginClass, isScrolled }) => {
    const tabContainerClasses = `sticky top-16 z-30 transition-colors duration-300 ${marginClass} ${isScrolled ? 'bg-zinc-50/90 border-b border-gray-200 backdrop-blur-sm' : 'bg-transparent border-b border-transparent'}`;
    return (
        <div className={tabContainerClasses}>
            <div className="flex items-center justify-between py-2 px-4 sm:px-6 lg:px-8">
                {tabs.map(tab => ((counts[tab] > 0 || tab === 'all') && (
                    <button key={tab} onClick={() => onFilterChange(tab)} className={`px-4 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap transition-colors duration-200 ${activeFilter === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
                        <span className="capitalize">{tab}</span> <span className="ml-2 text-xs font-normal bg-black/10 rounded-full px-2 py-0.5">{counts[tab]}</span>
                    </button>
                )))}
            </div>
        </div>
    );
};


// --- Main Header with FIX ---
const ProfileHeader = ({ isScrolled, pageType, headerProps }) => {
    const { user, activeRole, switchRole } = useAuth();
    const { toggleSidebar } = useUI();
    const navigate = useNavigate();

    if (!user) return null;

    const handleSwitchRole = () => {
        if (activeRole === 'student') {
            if (user && user.roles && user.roles.includes('Landlord')) {
                switchRole('landlord');
                navigate('/landlord/overview');
            } else {
                navigate('/list-your-room');
            }
        } else {
            switchRole('student');
            navigate('/profile');
        }
    };

    const headerClasses = `fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${isScrolled ? 'bg-zinc-50/90 shadow-sm border-b border-gray-200 backdrop-blur-sm' : 'bg-transparent border-b border-transparent'}`;

    return (
        <header className={headerClasses}>
            <div className="flex items-center h-full">
                {/* --- Left Side (Shared) --- */}
                <div className={`flex-shrink-0 flex items-center gap-4 px-4 sm:px-6 lg:px-8`}>
                    <button onClick={toggleSidebar} className="hidden md:block p-2 rounded-full hover:bg-gray-100/80">
                        <Bars3Icon className="h-6 w-6 text-gray-700" />
                    </button>
                    <Link to="/" className="text-2xl font-bold text-red-500">RoomRadar</Link>
                </div>

                {/* --- Right Side (Conditional Layout) --- */}
                {pageType === 'inbox' ? (
                    // Layout for INBOX page
                    <div className="flex flex-1 items-center h-full pr-4 sm:pr-6 lg:pr-8">
                        
                        {/* --- [FIX 2] ---
                          This div is now responsive.
                          - 'w-full' on mobile (default)
                          - 'md:w-[400px]' on medium screens and up
                          - 'px-4' adds padding on mobile, 'md:px-0' removes it on desktop
                        */}
                        <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex justify-center px-4 md:px-0">
                            <InboxHeaderSearch {...headerProps.inbox} />
                        </div>
                        
                        <div className="flex-1 flex items-center justify-between pl-4">
                            <div className="font-bold text-gray-800 hidden md:block">{headerProps.inbox.activeChatName}</div>
                            <div className="flex items-center gap-4 ml-auto"> {/* Added ml-auto to push to the right */}
                                <button onClick={handleSwitchRole} className={`text-sm font-semibold py-2 px-4 rounded-full transition-colors duration-300 hidden sm:block ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-800 hover:bg-gray-200/50'}`}>
                                    {activeRole === 'landlord' ? 'Switch to Renting' : 'Switch to Hosting'}
                                </button>
                                <Link to="/profile" className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white font-semibold">
                                    {user.name.charAt(0).toUpperCase()}
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Layout for APPLICATIONS and other pages
                    <div className="flex flex-1 items-center justify-between h-full pr-4 sm:pr-6 lg:pr-8">
                        <div className="flex-1 flex justify-center px-4">
                            {pageType === 'applications' && <ApplicationsHeaderSearch {...headerProps.applications} />}
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleSwitchRole} className={`text-sm font-semibold py-2 px-4 rounded-full transition-colors duration-300 hidden sm:block ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-800 hover:bg-gray-200/50'}`}>
                                {activeRole === 'landlord' ? 'Switch to Renting' : 'Switch to Hosting'}
                            </button>
                            <Link to="/profile" className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};


// --- Main Layout Component (No Changes Here) ---
const StudentProfileLayout = () => { // Renamed from ProfilePage to be clear
    const mainContentRef = useRef(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const { isSidebarOpen } = useUI();
    const location = useLocation();

    // State for child pages
    const [inboxSearchTerm, setInboxSearchTerm] = useState('');
    const [activeChatName, setActiveChatName] = useState(null);
    const [applicationSearchTerm, setApplicationSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [applicationCounts, setApplicationCounts] = useState({ all: 0 });
    const TABS = ['all', 'pending', 'approved', 'confirmed', 'rejected', 'cancelled'];

    useEffect(() => {
        const mainEl = mainContentRef.current;
        if (!mainEl) return;
        const handleScroll = () => setIsScrolled(mainEl.scrollTop > 10);
        mainEl.addEventListener('scroll', handleScroll);
        return () => mainEl.removeEventListener('scroll', handleScroll);
    }, []);

    // Determine page type
    let pageType = 'default';
    if (location.pathname.includes('/inbox')) pageType = 'inbox';
    if (location.pathname.includes('/my-applications')) pageType = 'applications';

    const mainContentMargin = isSidebarOpen ? 'md:ml-64' : 'md:ml-20';

    const outletContext = {
        searchTerm: inboxSearchTerm,
        setSearchTerm: setInboxSearchTerm,
        setActiveChatName,
        applicationSearchTerm,
        activeFilter,
        setApplicationCounts,
    };

    return (
        <div className="bg-zinc-50">
            <ProfileHeader
                isScrolled={isScrolled}
                pageType={pageType}
                headerProps={{
                    inbox: { searchTerm: inboxSearchTerm, setSearchTerm: setInboxSearchTerm, activeChatName },
                    applications: { searchTerm: applicationSearchTerm, setSearchTerm: setApplicationSearchTerm }
                }}
            />
            <ProfileSidebar />

            {pageType === 'applications' && (
                <FilterTabs
                    tabs={TABS}
                    counts={applicationCounts}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    marginClass={mainContentMargin}
                    isScrolled={isScrolled}
                />
            )}

            {/* Main content area */}
            {pageType === 'applications' ? (
                // Special layout for Applications to account for filter tabs
                <main ref={mainContentRef} className={`pb-16 md:pb-0 h-screen overflow-y-auto transition-all duration-300 ${mainContentMargin}`}>
                    <div className="pt-28 p-4 sm:p-6 lg:p-8">
                        <Outlet context={outletContext} />
                    </div>
                </main>
            ) : (
                // Standard layout for Inbox, Wishlist, etc.
                <main ref={mainContentRef} className={`pb-16 md:pb-0 h-screen transition-all duration-300 ${mainContentMargin} flex flex-col`}>
                    <div className="h-16 flex-shrink-0" /> {/* Spacer for the header */}
                    <div className="flex-1 overflow-y-auto">
                        <div className={pageType === 'inbox' ? 'h-full' : 'p-4 sm:p-6 lg:p-8'}>
                            <Outlet context={outletContext} />
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default StudentProfileLayout; // Renamed export