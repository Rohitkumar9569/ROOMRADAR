import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Home, Heart, FileText, Mail, User } from 'lucide-react';
import { useSocket } from '../../../context/SocketContext';

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
    const { unreadNotificationCount } = useSocket();

    const navItems = [
        { path: '/', label: 'Explore', Icon: Home, isProtected: false, count: 0 },
        { path: '/profile/wishlist', label: 'Wishlist', Icon: Heart, isProtected: true, count: 0 },
        { path: '/profile/my-applications', label: 'Apps', Icon: FileText, isProtected: true, count: 0 },
        { path: '/profile/inbox', label: 'Inbox', Icon: Mail, isProtected: true, count: unreadNotificationCount },
        { path: '/profile', label: 'Profile', Icon: User, isProtected: true, count: 0 },
    ];

    // Compact & Clean Styling Logic
    const navLinkClass = ({ isActive }) =>
        `relative flex flex-col items-center justify-center w-full h-full transition-all duration-200
        ${isActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`;

    return (
        // ✨ FIX: h-14 (Compact Height), fixed bottom-0 (Stuck to bottom), z-50 (Always on top)
        // pb-safe ensures background covers iPhone home bar area but content stays in h-14
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
            
            <div className="flex justify-around items-center h-14"> {/* Fixed Compact Height */}
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
                                <div className="relative flex flex-col items-center">
                                    <item.Icon 
                                        size={22} // Slightly smaller icons for compact look
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}
                                    />

                                    {/* Notification Badge */}
                                    {item.count > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center 
                                                         rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                                            {item.count}
                                        </span>
                                    )}

                                    <span className={`text-[10px] font-medium leading-none ${isActive ? 'font-bold' : ''}`}>
                                        {item.label}
                                    </span>
                                </div>
                            </>
                        )}
                    </ConditionalNavLink>
                ))}
            </div>
        </nav>
    );
}

export default BottomNavBar;