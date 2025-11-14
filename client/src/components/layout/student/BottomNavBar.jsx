// src/components/layout/student/BottomNavBar.jsx

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Home, Heart, FileText, Mail, User } from 'lucide-react';
import { useSocket } from '../../../context/SocketContext'; // 1. Import useSocket

const ConditionalNavLink = ({ path, isProtected, children, ...props }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleClick = (e) => {
        if (isProtected && !user) {
            e.preventDefault();
            navigate('/login', { state: { from: path } });
        }
    };

    return (
        <NavLink to={path} onClick={handleClick} {...props}>
            {({ isActive }) => children({ isActive })}
        </NavLink>
    );
};

function BottomNavBar() {
    // 2. Get the unread count from the context
    const { unreadNotificationCount } = useSocket();

    const navItems = [
        { path: '/', label: 'Explore', Icon: Home, isProtected: false, count: 0 },
        { path: '/profile/wishlist', label: 'Wishlist', Icon: Heart, isProtected: true, count: 0 },
        { path: '/profile/my-applications', label: 'Applications', Icon: FileText, isProtected: true, count: 0 },
        // 3. Pass the count to the 'Inbox' item
        { path: '/profile/inbox', label: 'Inbox', Icon: Mail, isProtected: true, count: unreadNotificationCount },
        { path: '/profile', label: 'Profile', Icon: User, isProtected: true, count: 0 },
    ];

    // The active class remains 'text-red-500' to match your brand
    const navLinkClass = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 group ${
            isActive ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
        }`;

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 md:hidden z-50">
            <div className="flex justify-around items-center h-full">
                {navItems.map((item) => (
                    <ConditionalNavLink 
                        path={item.path} 
                        key={item.label} 
                        className={navLinkClass}
                        isProtected={item.isProtected}
                        end={item.path === '/' || item.path === '/profile'}
                    >
                        {({ isActive }) => (
                            <>
                                {/* 4. Add a relative wrapper for the badge */}
                                <div className="relative">
                                    <item.Icon 
                                        size={24} 
                                        strokeWidth={isActive ? 2.5 : 1.5} // Active = Bold
                                        className="transition-transform duration-200 group-hover:scale-110"
                                    />
                                    {/* 5. The Notification Badge */}
                                    {item.count > 0 && (
                                        <span className="absolute -top-1 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                            {item.count}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs mt-1 font-medium">{item.label}</span>
                            </>
                        )}
                    </ConditionalNavLink>
                ))}
            </div>
        </nav>
    );
}

export default BottomNavBar;