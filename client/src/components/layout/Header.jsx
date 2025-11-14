import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon, UserCircleIcon, GlobeAltIcon } from '@heroicons/react/24/solid';

const UserMenu = () => {
    const { user, logout, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleSwitchRole = () => {
        if (activeRole === 'student') {
            switchRole('landlord');
            navigate('/landlord/overview');
        } else {
            switchRole('student');
            navigate('/');
        }
    };

    const renderUserIcon = () => {
        if (user?.avatarUrl) {
            return <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />;
        }
        if (user?.name) {
            return <span className="font-semibold text-white">{user.name.charAt(0).toUpperCase()}</span>;
        }
        return <UserCircleIcon className="h-8 w-8 text-gray-400" />;
    };

    if (!user) {
        // Logged-out view
        return (
            <div className="flex items-center gap-2">
                <Link to="/list-your-room" className="hidden md:block text-sm font-medium py-2 px-4 rounded-full hover:bg-neutral-100 transition">
                    Become a host
                </Link>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 border border-neutral-200 rounded-full py-1.5 px-2.5 transition hover:shadow-md">
                        <Bars3Icon className="h-5 w-5 text-gray-600" />
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg py-2 z-20 top-full">
                            <NavLink to="/login" className="block w-full text-left px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-neutral-100">Log in</NavLink>
                            <NavLink to="/signup" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">Sign up</NavLink>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Logged-in User View
    return (
        <div className="flex items-center gap-4" ref={menuRef}>
            
            {/* This is the final, corrected logic for the button */}
            {user?.roles?.includes('Landlord') ? (
                // If user IS a Landlord, show the functional switch button
                <button
                    onClick={handleSwitchRole}
                    className="hidden md:block text-sm font-medium py-2 px-4 rounded-full hover:bg-neutral-100 transition"
                >
                    {activeRole === 'student' ? 'Switch to Hosting' : 'Switch to Travelling'}
                </button>
            ) : (
                // If user is NOT a Landlord, show the "Become a Host" link
                <Link 
                    to="/list-your-room" 
                    className="hidden md:block text-sm font-medium py-2 px-4 rounded-full hover:bg-neutral-100 transition"
                >
                    Become a Host
                </Link>
            )}
            
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-10 w-10 bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden">
                    {renderUserIcon()}
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg py-2 z-20 top-full">
                        <NavLink to="/profile/my-applications" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">My Applications</NavLink>
                        <NavLink to="/profile/wishlist" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">Wishlist</NavLink>
                        <hr className="my-2" />
                        {user?.roles?.includes('Landlord') && (
                             <NavLink to="/landlord/overview" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">Hosting Dashboard</NavLink>
                        )}
                        <NavLink to="/profile" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">Account</NavLink>
                        <hr className="my-2" />
                        <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-neutral-100">Log out</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Header = () => {
    const getNavLinkClass = ({ isActive }) => {
        const baseClass = "py-2 transition";
        return isActive
            ? `${baseClass} font-medium text-black border-b-2 border-black`
            : `${baseClass} text-neutral-500 hover:text-black`;
    };

    return (
        <header className="sticky top-0 bg-white z-50 shadow-sm">
            <div className="border-b">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex-1 flex justify-start">
                            <Link to="/" className="text-2xl font-bold text-red-500">RoomRadar</Link>
                        </div>
                        <div className="hidden md:flex flex-1 justify-center">
                            <div className="flex items-center space-x-8">
                                <NavLink to="/rooms" className={getNavLinkClass}>Rooms</NavLink>
                                <NavLink to="/flats" className={getNavLinkClass}>Flats</NavLink>
                                <NavLink to="/roommates" className={getNavLinkClass}>Roommates</NavLink>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <UserMenu />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;