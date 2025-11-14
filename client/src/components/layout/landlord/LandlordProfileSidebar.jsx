import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import { LayoutDashboard, Calendar, List, PlusCircle, Mail, User, LogOut } from 'lucide-react';
import Tippy from '@tippyjs/react';

const LandlordProfileSidebar = () => {
    const { user, logout } = useAuth();
    const { isSidebarOpen } = useUI();
    const navigate = useNavigate();
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(5);

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const renderNavLink = (to, Icon, label, isEnd = false, badgeCount = 0) => (
        <Tippy content={label} placement="right" disabled={isSidebarOpen}>
            <NavLink to={to} end={isEnd} className={({ isActive }) => 
                `flex items-center w-full p-4 rounded-lg transition-colors duration-200 group relative ${isSidebarOpen ? 'gap-4' : 'justify-center'} ${
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
                        {badgeCount > 0 && (
                            <span className={`absolute top-2 ${isSidebarOpen ? 'right-3' : 'right-2'} h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full`}>
                                {badgeCount}
                            </span>
                        )}
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
                    {/* The "Back to Home" link has been removed from here */}
                    {renderNavLink('/landlord/overview', LayoutDashboard, 'Dashboard')}
                    {renderNavLink('/landlord/calendar', Calendar, 'Calendar')}
                    {renderNavLink('/landlord/my-rooms', List, 'Listings')}
                    {renderNavLink('/landlord/add-room', PlusCircle, 'Add New Room')}
                    {renderNavLink('/landlord/inbox', Mail, 'Inbox', false, unreadMessagesCount)}
                    {renderNavLink('/landlord/profile', User, 'About me', true)}
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

export default LandlordProfileSidebar;