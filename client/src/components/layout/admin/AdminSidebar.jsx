import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const AdminSidebar = () => {
    const { logout } = useAuth();
    const getNavLinkClass = ({ isActive }) => 
        `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`;

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen p-4 bg-white border-r fixed">
            <Link to="/admin/dashboard" className="text-2xl font-bold text-indigo-600 mb-8">
                RoomRadar Admin
            </Link>
            <nav className="flex flex-col gap-2 flex-grow">
                <NavLink to="/admin/dashboard" className={getNavLinkClass}>
                    <LayoutDashboard size={20} /> Dashboard
                </NavLink>
                <NavLink to="/admin/users" className={getNavLinkClass}>
                    <Users size={20} /> Users
                </NavLink>
                <NavLink to="/admin/rooms" className={getNavLinkClass}>
                    <Home size={20} /> Rooms
                </NavLink>
            </nav>
            <div className="mt-auto">
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50">
                    <LogOut size={20} /> Log Out
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;