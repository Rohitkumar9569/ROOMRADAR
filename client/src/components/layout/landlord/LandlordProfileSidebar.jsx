import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import { useSocket } from '../../../context/SocketContext';
import { Calendar, ClipboardList, LayoutDashboard, List, LogOut, Mail, PanelLeftClose, PanelLeftOpen, PlusCircle, User } from 'lucide-react';
import Tippy from '@tippyjs/react';

const navItems = [
    { to: '/landlord/overview', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/landlord/calendar', label: 'Calendar', Icon: Calendar },
    { to: '/landlord/applications', label: 'Requests', Icon: ClipboardList },
    { to: '/landlord/my-rooms', label: 'Listings', Icon: List },
    { to: '/landlord/add-room', label: 'Add New Room', Icon: PlusCircle },
    { to: '/landlord/inbox', label: 'Inbox', Icon: Mail, badge: true },
    { to: '/landlord/profile', label: 'About me', Icon: User, end: true },
];

const LandlordProfileSidebar = () => {
    const { user, logout, switchRole } = useAuth();
    const { isSidebarOpen, toggleSidebar } = useUI();
    const { unreadNotificationCount } = useSocket();
    const navigate = useNavigate();
    const inboxCount = unreadNotificationCount || 0;
    const hostProfile = user?.roleProfiles?.landlord || {};
    const hostName = hostProfile.name || user?.name || 'Host';
    const hostAvatar = hostProfile.avatarUrl || hostProfile.profilePicture || user?.avatarUrl || user?.profilePicture;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSwitchRole = () => {
        switchRole('student');
        navigate('/profile');
    };

    const renderNavLink = ({ to, Icon, label, end, badge }) => (
        <Tippy key={label} content={label} placement="right" disabled={isSidebarOpen}>
            <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                    `relative flex items-center rounded-2xl border-l-2 text-sm font-extrabold transition-all duration-200 ${
                        isSidebarOpen ? 'w-full gap-3 px-3 py-3' : 'mx-auto h-11 w-11 justify-center px-0 py-0'
                    } ${
                        isActive
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300'
                            : 'border-transparent text-light-muted hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5 dark:hover:text-white'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        <Icon size={isSidebarOpen ? 20 : 19} strokeWidth={isActive ? 2.7 : 2} className={`flex-shrink-0 ${isActive ? 'text-cyan-500 dark:text-cyan-300' : 'text-current'}`} />
                        {isSidebarOpen && <span className="truncate">{label}</span>}
                        {badge && inboxCount > 0 && (
                            <span className={`absolute flex items-center justify-center rounded-full bg-rose-500 font-black text-white ${isSidebarOpen ? 'right-3 h-5 min-w-5 px-1.5 text-[11px]' : '-right-1 -top-1 h-4 min-w-4 px-1 text-[9px]'}`}>
                                {inboxCount}
                            </span>
                        )}
                    </>
                )}
            </NavLink>
        </Tippy>
    );

    const sidebarWidth = isSidebarOpen ? 'w-72' : 'w-20';

    return (
        <aside className={`hidden md:flex fixed left-0 top-0 z-40 h-screen ${sidebarWidth} flex-col border-r border-light-border bg-white/90 shadow-2xl shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 dark:border-dark-border dark:bg-dark-sidebar/95 ${isSidebarOpen ? 'p-4' : 'p-2'}`}>
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <Link to="/" className={`flex items-center ${isSidebarOpen ? 'gap-3' : ''}`}>
                    <span className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 font-black text-white shadow-lg shadow-cyan-500/20 ${isSidebarOpen ? 'h-11 w-11 text-lg' : 'h-10 w-10 text-base'}`}>R</span>
                    {isSidebarOpen && (
                        <div>
                            <p className="text-lg font-black leading-5 text-light-text dark:text-white">RoomRadar</p>
                            <p className="inline-flex rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Hosting</p>
                        </div>
                    )}
                </Link>
                {isSidebarOpen && (
                    <button onClick={toggleSidebar} className="rounded-full p-2 text-light-muted transition hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5" title="Collapse sidebar">
                        <PanelLeftClose className="h-5 w-5" />
                    </button>
                )}
            </div>

            {!isSidebarOpen && (
                <button onClick={toggleSidebar} className="mx-auto mt-3 rounded-xl p-2 text-light-muted transition hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5" title="Expand sidebar">
                    <PanelLeftOpen className="h-4 w-4" />
                </button>
            )}

            {isSidebarOpen && <div className="mt-6 rounded-3xl bg-light-bg p-3 dark:bg-dark-card">
                <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                    <Link to="/landlord/profile" className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-black text-white">
                        {hostAvatar ? <img src={hostAvatar} alt={hostName} className="h-full w-full object-cover" /> : hostName.charAt(0).toUpperCase()}
                    </Link>
                    {isSidebarOpen && (
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-light-text dark:text-white">{hostName}</p>
                            <p className="text-xs font-bold text-light-muted dark:text-dark-muted">Manage your rooms</p>
                        </div>
                    )}
                </div>
            </div>}

            <nav className={`flex flex-1 flex-col ${isSidebarOpen ? 'mt-6 gap-2 overflow-y-auto' : 'mt-3 gap-1 overflow-hidden'}`}>
                {navItems.map(renderNavLink)}
            </nav>

            <div className={`${isSidebarOpen ? 'mt-4 space-y-2 border-t border-light-border pt-4 dark:border-dark-border' : 'mt-2 space-y-1 border-t border-light-border pt-2 dark:border-dark-border'}`}>
                <Tippy content="Switch to Travelling" placement="right" disabled={isSidebarOpen}>
                    <button
                        onClick={handleSwitchRole}
                        className={`flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-cyan-600 font-extrabold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-105 ${isSidebarOpen ? 'px-3 py-3 text-sm' : 'min-h-10 px-2 text-[11px]'}`}
                    >
                        {isSidebarOpen ? 'Switch to Travelling' : 'Travel'}
                    </button>
                </Tippy>
                <Tippy content="Log out" placement="right" disabled={isSidebarOpen}>
                    <button onClick={handleLogout} className={`flex w-full items-center rounded-2xl font-extrabold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 ${isSidebarOpen ? 'gap-3 px-3 py-3 text-sm' : 'h-10 justify-center px-0 py-0 text-xs'}`}>
                        <LogOut size={isSidebarOpen ? 20 : 18} strokeWidth={2.2} />
                        {isSidebarOpen && <span>Log out</span>}
                    </button>
                </Tippy>
            </div>
        </aside>
    );
};

export default LandlordProfileSidebar;
