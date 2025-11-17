import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Home, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion'; //  Import Motion

const AdminBottomNavBar = () => {
    const navItems = [
        { path: '/admin/dashboard', Icon: LayoutDashboard, name: 'Dashboard' },
        { path: '/admin/users', Icon: Users, name: 'Users' },
        { path: '/admin/rooms', Icon: Home, name: 'Rooms' },
        { path: '/admin/profile', Icon: UserCircle, name: 'Me' },
    ];

    return (
        //  Container: Compact (h-14), Glassmorphism, Flush to bottom
        <nav className="fixed bottom-0 left-0 right-0 z-50 
                        h-14 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 
                        md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            
            <div className="flex justify-around items-center h-full px-1">
                {navItems.map((item) => (
                    <NavLink 
                        to={item.path} 
                        key={item.name} 
                        className="relative flex-1 flex flex-col items-center justify-center h-full"
                    >
                        {({ isActive }) => (
                            <motion.div 
                                className="relative flex flex-col items-center justify-center w-full h-full"
                                whileTap={{ scale: 0.9 }} // Click Press Effect
                            >
                                {/*  Indigo Water Splash Effect */}
                                {isActive && (
                                    <motion.div
                                        layoutId="admin-nav-bubble"
                                        className="absolute inset-0 m-auto w-10 h-10 bg-indigo-50 rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <item.Icon 
                                    size={22} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
                                />

                                <span className={`text-[9px] font-medium mt-0.5 transition-colors duration-200 
                                    ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {item.name}
                                </span>

                            </motion.div>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default AdminBottomNavBar;