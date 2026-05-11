import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/solid';
import { Bell, Moon, Search, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useScrollState from '../../hooks/useScrollState';

const UserMenu = ({ isOverlay = false }) => {
    const { user, logout, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitchRole = () => {
        if (activeRole === 'student') {
            switchRole('landlord');
            navigate('/landlord/overview');
        } else {
            switchRole('student');
            navigate('/');
        }
        setIsMenuOpen(false);
    };

    const renderUserIcon = () => {
        const avatar = user?.avatarUrl || user?.profilePicture;
        if (avatar) return <img src={avatar} alt="avatar" className="h-full w-full object-cover" />;
        if (user?.name) return <span className="font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>;
        return <UserCircleIcon className="h-8 w-8 text-slate-400" />;
    };

    const hostLinkClass = [
        'hidden rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 lg:inline-flex',
        isOverlay
            ? 'text-white/95 hover:bg-white/[0.14] hover:text-white'
            : 'text-slate-800 hover:bg-slate-900/5 dark:text-slate-100 dark:hover:bg-white/10',
    ].join(' ');

    if (!user) {
        return (
            <div className="flex items-center gap-2" ref={menuRef}>
                <Link to="/list-your-room" className={hostLinkClass}>
                    Become a host
                </Link>
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                            isOverlay
                                ? 'border-white/[0.24] bg-white/[0.14] text-white shadow-black/10'
                                : 'border-slate-200/80 bg-white/75 text-slate-800 dark:border-slate-700/80 dark:bg-slate-900/75 dark:text-slate-100'
                        }`}
                    >
                        <Bars3Icon className="h-5 w-5" />
                        <UserCircleIcon className="h-8 w-8 text-slate-400" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-slate-800 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                            <NavLink to="/login" className="block px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Log in</NavLink>
                            <NavLink to="/signup" className="block px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Sign up</NavLink>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3" ref={menuRef}>
            {user?.roles?.includes('Landlord') ? (
                <button onClick={handleSwitchRole} className={hostLinkClass}>
                    {activeRole === 'student' ? 'Switch to Hosting' : 'Switch to Travelling'}
                </button>
            ) : (
                <Link to="/list-your-room" className={hostLinkClass}>
                    Become a Host
                </Link>
            )}
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                        isOverlay
                            ? 'bg-white/[0.18] ring-white/60 backdrop-blur-xl'
                            : 'bg-slate-900 ring-white/70 dark:bg-slate-700 dark:ring-slate-900/80'
                    }`}
                >
                    {renderUserIcon()}
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-slate-800 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                        <NavLink to="/profile/my-applications" className="block px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">My Applications</NavLink>
                        <NavLink to="/profile/wishlist" className="block px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Wishlist</NavLink>
                        {user?.roles?.includes('Landlord') && <NavLink to="/landlord/overview" className="block px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Hosting Dashboard</NavLink>}
                        <NavLink to="/profile" className="block px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Account</NavLink>
                        <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">Log out</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Header = () => {
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isScrolled } = useScrollState(8, false, { mediaQuery: '(min-width: 768px)' });
    const isHome = location.pathname === '/';
    const isOverlay = isHome && !isScrolled;

    const getNavLinkClass = ({ isActive }) => [
        'rounded-full px-4 py-2 text-sm font-bold transition-all duration-200',
        isActive
            ? (isOverlay ? 'bg-white text-slate-950 shadow-sm' : 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950')
            : (isOverlay ? 'text-white/[0.88] hover:bg-white/[0.14] hover:text-white' : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10'),
    ].join(' ');

    const actionClass = [
        'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-0.5',
        isOverlay
            ? 'bg-white/[0.18] text-white ring-1 ring-white/[0.28] backdrop-blur-2xl hover:bg-white/[0.26] hover:ring-white/[0.42]'
            : 'bg-white/[0.62] text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl hover:bg-white hover:shadow-lg dark:bg-slate-900/[0.62] dark:text-slate-100 dark:ring-slate-700/80 dark:hover:bg-slate-900',
    ].join(' ');

    const header = (
        <header className={`fixed inset-x-0 top-0 z-50 hidden h-[76px] transition-all duration-300 md:block ${isOverlay ? 'border-b border-white/10 bg-slate-950/[0.22] text-white shadow-[0_18px_50px_-36px_rgba(0,0,0,0.7)] backdrop-blur-xl' : isHome ? 'rr-desktop-home-header-scrolled' : 'border-b border-slate-200/70 bg-slate-50/90 text-slate-950 shadow-[0_20px_48px_-38px_rgba(15,23,42,0.62)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-50'}`}>
            <div className="mx-auto grid h-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-5 px-6 lg:px-8">
                <Link to="/" className="group inline-flex items-center text-2xl font-black tracking-tight" aria-label="RoomRadar home">
                    <span className="text-[#FF385C]">Room</span><span className="text-cyan-500">Radar</span>
                </Link>

                <div className={`flex items-center gap-1 rounded-full border px-1.5 py-1.5 shadow-lg backdrop-blur-2xl transition-all duration-300 ${
                    isOverlay
                        ? 'border-white/[0.26] bg-white/[0.18] shadow-black/20'
                        : 'border-slate-200/70 bg-white/[0.72] shadow-slate-950/10 dark:border-slate-700/75 dark:bg-slate-900/[0.72] dark:shadow-black/20'
                }`}>
                    <nav className="flex items-center gap-1">
                        <NavLink to="/rooms" className={getNavLinkClass}>Rooms</NavLink>
                        <NavLink to="/profile/my-applications" className={getNavLinkClass}>Applications</NavLink>
                        <NavLink to="/profile/inbox" className={getNavLinkClass}>Inbox</NavLink>
                    </nav>
                    {isHome && isScrolled && (
                        <>
                            <span className="mx-1 h-6 w-px bg-slate-300/80 dark:bg-slate-700/80" />
                            <Link to="/rooms" className="flex h-9 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                                <Search className="h-4 w-4 text-cyan-400 dark:text-cyan-500" />
                                Start search
                            </Link>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Link to="/profile/inbox" className={actionClass} aria-label="Open inbox">
                        <Bell className="h-5 w-5" />
                    </Link>
                    <button type="button" onClick={toggleTheme} className={actionClass} aria-label="Toggle theme">
                        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <UserMenu isOverlay={isOverlay} />
                </div>
            </div>
        </header>
    );

    return typeof document === 'undefined' ? header : createPortal(header, document.body);
};

export default Header;
