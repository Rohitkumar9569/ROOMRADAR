// client/src/components/ProfileSidebar.jsx

import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import { Home, Heart, FileText, Mail, User, LogOut } from 'lucide-react';
import Tippy from '@tippyjs/react'; // 1. Import Tippy

const ProfileSidebar = () => {
    const { user, logout } = useAuth();
    const { isSidebarOpen } = useUI();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const renderNavLink = (to, Icon, label, isEnd = false) => (
        <Tippy content={label} placement="right" disabled={isSidebarOpen}>
            <NavLink to={to} end={isEnd} className={({ isActive }) => 
                `flex items-center w-full p-4 rounded-lg transition-colors duration-200 group ${isSidebarOpen ? 'gap-4' : 'justify-center'} ${
                    isActive ? 'bg-gray-200 font-semibold text-gray-900' : 'font-medium text-gray-600 hover:bg-gray-100'
                }`
            }>
                {({ isActive }) => (
                    <>
                        <Icon 
                            size={isSidebarOpen ? 22 : 26} 
                            strokeWidth={isActive ? 2.5 : 1.5}
                            className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        />
                        {isSidebarOpen && <span>{label}</span>}
                    </>
                )}
            </NavLink>
        </Tippy>
    );

    const sidebarWidth = isSidebarOpen ? 'w-64' : 'w-20';

    return (
        <aside className={`hidden md:flex fixed top-16 left-0 h-[calc(100vh-4rem)] bg-zinc-50 p-4 flex-col transition-all duration-300 ${sidebarWidth}`}>
            <div className={`flex items-center gap-3 px-2 pb-4 border-b border-gray-200 ${!isSidebarOpen && 'justify-center'}`}>
                 {/* User info JSX */}
            </div>

            <div className="flex-grow overflow-y-auto mt-4">
                <nav className="flex flex-col space-y-1">
                    <Tippy content="Back to Home" placement="right" disabled={isSidebarOpen}>
                        <Link to="/" className={`flex items-center w-full p-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 group ${isSidebarOpen ? 'gap-4' : 'justify-center'}`}>
                            <Home size={isSidebarOpen ? 22 : 26} strokeWidth={1.5} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            {isSidebarOpen && <span>Back to Home</span>}
                        </Link>
                    </Tippy>
                </nav>

                <div className="my-3 border-t border-gray-200"></div>

                <nav className="flex flex-col space-y-1">
                    {renderNavLink('/profile/wishlist', Heart, 'Wishlist')}
                    {renderNavLink('/profile/my-applications', FileText, 'My Applications')}
                    {renderNavLink('/profile/inbox', Mail, 'Inbox')}
                    {renderNavLink('/profile', User, 'About me', true)}
                </nav>
            </div>

            <div className="mt-auto flex-shrink-0 pt-3 border-t border-gray-200">
                <Tippy content="Log out" placement="right" disabled={isSidebarOpen}>
                     <button onClick={handleLogout} className={`flex items-center w-full p-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 group ${isSidebarOpen ? 'gap-4' : 'justify-center'}`}>
                        <LogOut size={isSidebarOpen ? 22 : 26} strokeWidth={1.5} className="flex-shrink-0 text-red-500 transition-transform duration-200 group-hover:scale-110" />
                        {isSidebarOpen && <span className="text-red-500">Log out</span>}
                    </button>
                </Tippy>
            </div>
        </aside>
    );
};

export default ProfileSidebar;