// src/components/NavBar.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlobeAltIcon, Bars3Icon, UserCircleIcon } from '@heroicons/react/24/solid';
import SearchBar from './SearchBar'; // SearchBar is already imported

// NavBar now receives props from HomePage to manage the search state
const NavBar = ({ isSearchExpanded, setIsSearchExpanded, onSearch }) => {
    const { user, logout, notifications } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // No changes to this logic, it's perfect
    const unreadCount = useMemo(() => {
        return notifications ? notifications.filter(n => !n.isRead).length : 0;
    }, [notifications]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/');
    };

    const closeMenu = () => setIsMenuOpen(false);

    // The active tab style for "Rooms", "Flats", "Roommates"
    const activeLinkStyle = {
        color: '#000',
        fontWeight: '500',
        borderBottom: '2px solid #000',
    };

    return (
        // The header is sticky and has a high z-index to stay on top
        <header className="sticky top-0 bg-white z-50">
            {/* Top section of the header: Logo, Search, User Menu */}
            {/* The bottom border is conditional, disappears when search is expanded for a seamless look */}
            <div className={`border-b transition-colors duration-300 ${isSearchExpanded ? 'border-transparent' : 'border-gray-200'}`}>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">

                        {/* Logo (Left) - Takes up less space now */}
                        <div className="flex-1 min-w-0">
                            {isSidebarOpen && (
                                <Link to="/" className="text-2xl font-bold text-red-500">
                                    RoomRadar
                                </Link>
                            )}
                        </div>

                        {/* Middle Section: Switches between Tabs and SearchBar */}
                        <div className="flex-1 flex items-center justify-center px-4">
                            {/* When search is NOT expanded, show the navigation tabs */}
                            {!isSearchExpanded && (
                                <div className="flex items-center space-x-8 text-gray-500">
                                    <NavLink to="/rooms" style={({ isActive }) => isActive ? activeLinkStyle : undefined} className="py-2">Rooms</NavLink>
                                    <NavLink to="/flats" style={({ isActive }) => isActive ? activeLinkStyle : undefined} className="py-2">Flats</NavLink>
                                    <NavLink to="/roommates" style={({ isActive }) => isActive ? activeLinkStyle : undefined} className="py-2">Roommates</NavLink>
                                </div>
                            )}
                        </div>

                        {/*  User Menu (Right) - Takes up less space */}
                        <div className="flex-1 min-w-0 flex items-center justify-end">
                            <Link
                                to={user?.role === 'Landlord' ? '/landlord-dashboard/overview' : '/list-your-room'}
                                className="hidden md:block text-sm font-semibold py-3 px-4 rounded-full hover:bg-gray-100 transition"
                            >
                                {user?.role === 'Landlord' ? 'Hosting Dashboard' : 'List your Room'}
                            </Link>

                            <div className="flex items-center ml-2">
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="flex items-center gap-2 p-2 border rounded-full hover:shadow-md transition"
                                    >
                                        <Bars3Icon className="h-5 w-5 text-gray-700" />
                                        {user?.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full" />
                                        ) : (
                                            <UserCircleIcon className="h-8 w-8 text-gray-500" />
                                        )}
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {isMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 z-20 text-sm">
                                            {/* Your existing dropdown content logic is perfect and remains here */}
                                            {!user ? (
                                                <>
                                                    <NavLink to="/signup" onClick={closeMenu} className="block px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100">Sign up</NavLink>
                                                    <NavLink to="/login" onClick={closeMenu} className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Log in</NavLink>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Links for logged-in users */}
                                                    <NavLink to="/profile" onClick={closeMenu} className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Profile</NavLink>
                                                    <NavLink to="/my-applications" onClick={closeMenu} className="block px-4 py-3 text-gray-700 hover:bg-gray-100">My Applications</NavLink>
                                                    <NavLink to="/wishlist" onClick={closeMenu} className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Wishlist</NavLink>
                                                    <div className="border-t my-2"></div>
                                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100">Log out</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Search Bar Area */}
            {/* This section appears with a smooth transition when search is expanded */}
            <div className={`transition-all duration-300 ease-in-out ${isSearchExpanded ? 'opacity-100 visible' : 'opacity-0 invisible h-0'}`}>
                <div className="pb-4">
                    <SearchBar
                        isExpanded={isSearchExpanded}
                        setIsExpanded={setIsSearchExpanded}
                        onSearch={onSearch}
                    />
                </div>
            </div>
        </header>
    );
};

export default NavBar;