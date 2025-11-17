import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Home, Heart, FileText, Mail, User } from 'lucide-react';
import { useSocket } from '../../../context/SocketContext';
import { motion } from 'framer-motion';

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

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 
                        h-14 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 
                        md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            
            <div className="flex justify-around items-center h-full px-1">
                {navItems.map((item) => (
                    <ConditionalNavLink 
                        path={item.path} 
                        key={item.label} 
                        isProtected={item.isProtected}
                        end={item.path === '/' || item.path === '/profile'}
                        className="relative flex-1 flex flex-col items-center justify-center h-full"
                    >
                        {({ isActive }) => (
                            <motion.div 
                                className="relative flex flex-col items-center justify-center w-full h-full"
                                whileTap={{ scale: 0.9 }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-bubble"
                                        className="absolute inset-0 m-auto w-10 h-10 bg-red-50 rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <div className="relative">
                                    <item.Icon 
                                        size={22} 
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-colors duration-200 ${isActive ? 'text-red-500' : 'text-gray-400'}`}
                                    />
                                    {item.count > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center 
                                                       rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                                            {item.count}
                                        </span>
                                    )}
                                </div>

                                <span className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-red-500' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>

                            </motion.div>
                        )}
                    </ConditionalNavLink>
                ))}
            </div>
        </nav>
    );
}

export default BottomNavBar;