import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import { useSocket } from '../../../context/SocketContext';
import { Compass, FileText, Heart, LogOut, Mail, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import Tippy from '@tippyjs/react';
import { getAvatarColorStyle, getAvatarInitial } from '../../../utils/avatar';
import { preloadRoleDestination, switchRoleSmoothly } from '../../../utils/roleSwitch';

const navItems = [
    { to: '/', label: 'Explore', Icon: Compass, end: true },
    { to: '/profile/wishlist', label: 'Wishlist', Icon: Heart },
    { to: '/profile/my-applications', label: 'Requests', Icon: FileText },
    { to: '/profile/inbox', label: 'Inbox', Icon: Mail, badge: true },
    { to: '/profile', label: 'About me', Icon: User, end: true },
];

const ProfileSidebar = () => {
    const { user, logout, switchRole } = useAuth();
    const { isSidebarOpen, toggleSidebar } = useUI();
    const { unreadNotificationCount } = useSocket();
    const navigate = useNavigate();
    const travelProfile = user?.roleProfiles?.student || {};
    const travelName = travelProfile.name || user?.name || user?.email || 'Traveller';
    const travelAvatar = travelProfile.avatarUrl || travelProfile.profilePicture || user?.avatarUrl || user?.profilePicture;
    const accountEmail = user?.email || '';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSwitchRole = async () => {
        if (user?.roles?.includes('Landlord')) {
            await switchRoleSmoothly({
                role: 'landlord',
                path: '/landlord/overview',
                switchRole,
                navigate,
            });
        } else {
            navigate('/list-your-room');
        }
    };

    const renderNavLink = ({ to, Icon, label, end, badge }) => (
        <Tippy key={label} content={label} placement="right" disabled={isSidebarOpen}>
            <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                    `relative flex w-full items-center rounded-2xl border-l-2 px-3 py-3 text-sm font-extrabold transition-all duration-200 ${
                        isSidebarOpen ? 'gap-3' : 'justify-center'
                    } ${
                        isActive
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:border-white/20 dark:bg-white/10 dark:text-white'
                            : 'border-transparent text-light-muted hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5 dark:hover:text-white'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        <Icon size={isSidebarOpen ? 20 : 24} strokeWidth={isActive ? 2.8 : 2.2} className={`flex-shrink-0 ${isActive ? 'text-cyan-500 dark:text-white' : 'text-current'}`} />
                        {isSidebarOpen && <span className="truncate">{label}</span>}
                        {badge && unreadNotificationCount > 0 && (
                            <span className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white ${isSidebarOpen ? 'right-3' : 'right-2 top-2'}`}>
                                {unreadNotificationCount}
                            </span>
                        )}
                    </>
                )}
            </NavLink>
        </Tippy>
    );

    const sidebarWidth = isSidebarOpen ? 'w-72' : 'w-24';

    return (
        <aside className={`hidden md:flex fixed left-0 top-0 z-40 h-screen ${sidebarWidth} flex-col border-r border-light-border bg-white/90 p-4 shadow-2xl shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 dark:border-dark-border dark:bg-dark-sidebar/95`}>
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <Link to="/" className={`flex items-center ${isSidebarOpen ? 'gap-3' : ''}`}>
                    {isSidebarOpen && (
                        <div>
                            <p className="text-2xl font-black leading-6 tracking-tight text-light-text dark:text-white">
                                <span className="text-brand">Room</span><span className="text-cyan-500">Radar</span>
                            </p>
                            <p className="inline-flex rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.1em] text-cyan-600 dark:text-cyan-300">Room seeker</p>
                        </div>
                    )}
                    {!isSidebarOpen && (
                        <span className="text-lg font-black leading-none tracking-tight">
                            <span className="text-brand">R</span><span className="text-cyan-500">R</span>
                        </span>
                    )}
                </Link>
                {isSidebarOpen && (
                    <button onClick={toggleSidebar} className="rounded-full p-2 text-light-muted transition hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5" title="Collapse sidebar">
                        <PanelLeftClose className="h-5 w-5" />
                    </button>
                )}
            </div>

            {!isSidebarOpen && (
                <button onClick={toggleSidebar} className="mx-auto mt-4 rounded-full p-2 text-light-muted transition hover:bg-black/5 hover:text-light-text dark:text-dark-muted dark:hover:bg-white/5" title="Expand sidebar">
                    <PanelLeftOpen className="h-5 w-5" />
                </button>
            )}

            <div className={`mt-6 rounded-3xl bg-light-bg p-3 dark:bg-dark-card ${isSidebarOpen ? '' : 'px-2'}`}>
                <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                    <Link to="/profile" className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-black text-white">
                        {travelAvatar ? (
                            <img src={travelAvatar} alt={travelName} className="h-full w-full object-cover" />
                        ) : (
                            <span className="rr-avatar-initial" style={getAvatarColorStyle(user?.id || user?._id || accountEmail, travelName)} aria-hidden="true">
                                {getAvatarInitial(travelName, accountEmail)}
                            </span>
                        )}
                    </Link>
                    {isSidebarOpen && (
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-light-text dark:text-white">{travelName}</p>
                            <p className="truncate text-xs font-bold text-light-muted dark:text-dark-muted">{accountEmail || 'Find your next stay'}</p>
                            <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-300">Find your next stay</p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-y-auto">
                {navItems.map(renderNavLink)}
            </nav>

            <div className="mt-4 space-y-2 border-t border-light-border pt-4 dark:border-dark-border">
                <Tippy content={user?.roles?.includes('Landlord') ? 'Switch to Hosting' : 'Become a Host'} placement="right" disabled={isSidebarOpen}>
                    <button
                        onClick={handleSwitchRole}
                        onMouseEnter={() => preloadRoleDestination(user?.roles?.includes('Landlord') ? 'landlord' : 'hostForm')}
                        onFocus={() => preloadRoleDestination(user?.roles?.includes('Landlord') ? 'landlord' : 'hostForm')}
                        className={`rr-role-switch-btn flex w-full items-center rounded-2xl bg-cyan-500 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-600 ${isSidebarOpen ? 'justify-center' : 'justify-center'}`}
                    >
                        {isSidebarOpen ? (user?.roles?.includes('Landlord') ? 'Switch to Hosting' : 'Become a Host') : 'Host'}
                    </button>
                </Tippy>
                <Tippy content="Log out" placement="right" disabled={isSidebarOpen}>
                    <button onClick={handleLogout} className={`flex w-full items-center rounded-2xl px-3 py-3 text-sm font-extrabold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <LogOut size={isSidebarOpen ? 20 : 24} strokeWidth={2.2} />
                        {isSidebarOpen && <span>Log out</span>}
                    </button>
                </Tippy>
            </div>
        </aside>
    );
};

export default ProfileSidebar;
