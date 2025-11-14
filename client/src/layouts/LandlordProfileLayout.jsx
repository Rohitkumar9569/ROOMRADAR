import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // useNavigate इम्पोर्ट करें
import LandlordProfileSidebar from '../components/layout/landlord/LandlordProfileSidebar';
import LandlordBottomNavBar from '../components/layout/landlord/LandlordBottomNavBar';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { FaPlus } from 'react-icons/fa';
import RoomFilterDropdown from '../components/features/search/RoomFilterDropdown';
import api from '../api';

// --- Reusable Search Component 
const HeaderSearch = ({ searchTerm, setSearchTerm, placeholder }) => (
    <div className="relative w-full max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
            type="text"
            placeholder={placeholder}
            className="w-full pl-10 p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
    </div>
);

// --- Dedicated Landlord Header (Only Switch Button is Changed) ---
const LandlordHeader = ({ isScrolled, isInboxPage, isMyRoomsPage, isCalendarPage, pageProps }) => {
    const { user, activeRole, switchRole } = useAuth();
    const { toggleSidebar, isSidebarOpen } = useUI();
    const navigate = useNavigate(); 

    if (!user) return null;

    const handleSwitchRole = () => {
        switchRole('student');
        navigate('/profile');
    };

    const headerClasses = `
        fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300
        ${isScrolled
            ? 'bg-zinc-50/90 shadow-sm border-b border-gray-200 backdrop-blur-sm'
            : 'bg-transparent border-b border-transparent'
        }
    `;

    const sidebarWidthClass = isSidebarOpen ? 'md:w-64' : 'md:w-20';
    const pageTitle = isInboxPage ? pageProps.activeChatName : "";

    return (
        <header className={headerClasses}>
            <div className="flex items-center h-full">
                {/* Left Side */}
                <div className={`flex-shrink-0 flex items-center gap-4 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${sidebarWidthClass}`}>
                    <button onClick={toggleSidebar} className="hidden md:block p-2 rounded-full hover:bg-gray-100/80">
                        <Bars3Icon className="h-6 w-6 text-gray-700" />
                    </button>
                    {isSidebarOpen && (
                        <Link to="/" className="text-2xl font-bold text-red-500">
                            RoomRadar
                        </Link>
                    )}
                </div>

                {/* Right Side of Header */}
                <div className="flex flex-1 items-center justify-between h-full pr-4 sm:pr-6 lg:pr-8">
                    {/* Left Group (Title, Search, Add Icon)  */}
                    <div className="flex items-center gap-52 md:ml-12">
                        <div>
                            {isInboxPage && <HeaderSearch searchTerm={pageProps.searchTerm} setSearchTerm={pageProps.setSearchTerm} placeholder="Search by name or room..." />}
                            {isMyRoomsPage && <HeaderSearch searchTerm={pageProps.searchTerm} setSearchTerm={pageProps.setSearchTerm} placeholder="Search in your listings..." />}
                            {isCalendarPage && (
                                <RoomFilterDropdown
                                    rooms={pageProps.calendarRooms}
                                    selectedRoomId={pageProps.selectedRoomId}
                                    onSelectRoom={pageProps.setSelectedRoomId}
                                />
                            )}
                        </div>
                        {isInboxPage && <div className="font-bold text-gray-800 w-32 hidden md:block truncate">{pageTitle}</div>}
                        {isMyRoomsPage && (
                            <Link to="/landlord/add-room" className="flex items-center justify-center h-10 w-10 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all">
                                <FaPlus size={16} />
                            </Link>
                        )}
                    </div>

                    {/* Right Group (User Menu) */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={handleSwitchRole}
                            className={`text-sm font-semibold py-2 px-4 rounded-full transition-colors duration-300 hidden sm:block ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-800 hover:bg-gray-200/50'}`}
                        >
                            Switch to Travelling
                        </button>
                        {/* ▲▲▲ */}
                        <Link
                            to="/landlord/profile"
                            className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                        >
                            <div className="h-full w-full flex items-center justify-center">{user.name.charAt(0).toUpperCase()}</div>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

// --- Main Layout Component 
const LandlordProfileLayout = ({ children }) => {
    const mainContentRef = useRef(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const { isSidebarOpen } = useUI();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChatName, setActiveChatName] = useState(null);
    const [calendarRooms, setCalendarRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState('all');

    useEffect(() => {
        const mainEl = mainContentRef.current;
        if (!mainEl) return;
        const handleScroll = () => { setIsScrolled(mainEl.scrollTop > 10) };
        mainEl.addEventListener('scroll', handleScroll);
        return () => mainEl.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setSearchTerm('');
        setSelectedRoomId('all');
    }, [location.pathname]);

    const isInboxPage = location.pathname.includes('/inbox');
    const isMyRoomsPage = location.pathname.includes('/my-rooms');
    const isCalendarPage = location.pathname.includes('/calendar');

    useEffect(() => {
        const fetchRoomsForFilter = async () => {
            if (isCalendarPage && calendarRooms.length === 0) {
                try {
                    const { data } = await api.get('/rooms/my-rooms');
                    setCalendarRooms(data);
                } catch (error) {
                    console.error("Failed to fetch rooms for filter");
                }
            }
        };
        fetchRoomsForFilter();
    }, [isCalendarPage, calendarRooms.length]);

    const pageProps = {
        searchTerm, setSearchTerm,
        activeChatName,
        calendarRooms, selectedRoomId, setSelectedRoomId
    };
    const outletContext = { searchTerm, setActiveChatName, selectedRoomId };
    const contentWrapperClass = isInboxPage ? 'h-full' : 'p-4 sm:p-6 lg:p-8';
    const mainContentMargin = isSidebarOpen ? 'md:ml-64' : 'md:ml-20';

    return (
        <div className="bg-zinc-50">
            <LandlordHeader
                isScrolled={isScrolled}
                isInboxPage={isInboxPage}
                isMyRoomsPage={isMyRoomsPage}
                isCalendarPage={isCalendarPage}
                pageProps={pageProps}
            />
            <LandlordProfileSidebar />
            <main ref={mainContentRef} className={`pb-16 md:pb-0 h-screen transition-all duration-300 ${mainContentMargin} flex flex-col`}>
                <div className="h-16 flex-shrink-0" />
                <div className="flex-1 overflow-y-auto">
                    <div className={contentWrapperClass}>
                        <Outlet context={outletContext} />
                    </div>
                </div>
            </main>
            <LandlordBottomNavBar />
        </div>
    );
};

export default LandlordProfileLayout;