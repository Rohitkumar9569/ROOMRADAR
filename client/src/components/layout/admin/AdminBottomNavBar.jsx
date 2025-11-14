import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Home, UserCircle } from 'lucide-react'; // Added UserCircle for 'Me'

const AdminBottomNavBar = () => {
    const navItems = [
        { path: '/admin/dashboard', Icon: LayoutDashboard, name: 'Dashboard' },
        { path: '/admin/users', Icon: Users, name: 'Users' },
        { path: '/admin/rooms', Icon: Home, name: 'Rooms' },
        { path: '/admin/profile', Icon: UserCircle, name: 'Me' }, // New 'Me' tab
    ];

    const navLinkClass = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 group ${
            isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
        }`;

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t md:hidden z-30">
            <div className="flex justify-around items-center h-full">
                {navItems.map((item) => (
                    <NavLink to={item.path} key={item.name} className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                <item.Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                                <span className="text-xs mt-1 font-medium">{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default AdminBottomNavBar;