// src/components/AboutMe.jsx

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRightIcon, ArrowPathIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const AboutMe = () => {
    const { user, logout, switchRole } = useAuth();
    const navigate = useNavigate();

    const handleSwitchRole = () => {
        if (user && user.roles && user.roles.includes('Landlord')) {
            switchRole('landlord');
            navigate('/landlord/overview');
        } else {
            navigate('/list-your-room');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const userName = user?.name || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-6">
            
            <div className="max-w-lg mx-auto mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Profile</h1>
            </div>
            
            <div className="bg-slate-800 text-white rounded-2xl p-8 max-w-lg mx-auto text-center shadow-lg">
                <div className="h-24 w-24 bg-indigo-500 rounded-full flex items-center justify-center overflow-hidden mx-auto ring-4 ring-slate-700">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-4xl font-semibold text-white">{userInitial}</span>
                    )}
                </div>
                <h3 className="text-3xl font-bold mt-4">{userName}</h3>
                <p className="text-slate-400 mt-1">Guest</p>
            </div>

            {/* 'Become a host' */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 mt-8 max-w-lg mx-auto flex items-center justify-between shadow-sm">
                <div>
                    <h4 className="font-semibold text-slate-800">Become a host</h4>
                    <p className="text-slate-600 text-sm mt-1">Start hosting and earn extra income.</p>
                </div>
                <Link to="/list-your-room" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                    <span>Get started</span>
                    <ArrowRightIcon className="h-4 w-4" />
                </Link>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 max-w-lg mx-auto md:hidden">
                <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-gray-200 shadow-sm">
                    <button 
                        onClick={handleSwitchRole}
                        className="w-full text-left py-4 px-5 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-3"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                        Switch to Hosting
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full text-left py-4 px-5 text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center gap-3"
                    >
                        <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                        Log out
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AboutMe;