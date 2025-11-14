import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, UserCircle } from 'lucide-react';

const AdminProfilePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col items-center">
                    <UserCircle className="h-24 w-24 text-slate-400 mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800">{user?.name}</h1>
                    <p className="text-slate-500">{user?.email}</p>
                    <div className="w-full border-t my-6"></div>
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        <LogOut size={20} /> Log Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProfilePage;