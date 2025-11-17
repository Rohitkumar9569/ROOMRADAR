// src/pages/auth/AuthPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google'; //  Import Google Hook
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

// Google Icon SVG Component
const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12.25V14.51H18.08C17.77 15.93 17.01 17.15 15.91 17.91V20.48H19.5C21.43 18.73 22.56 15.79 22.56 12.25Z" fill="#4285F4"/>
        <path d="M12.25 23C15.45 23 18.14 21.93 19.98 20.03L16.3 17.47C15.22 18.21 13.86 18.66 12.25 18.66C9.31 18.66 6.79 16.7 5.74 14.1L2.03 14.1V16.68C3.76 20.27 7.69 23 12.25 23Z" fill="#34A853"/>
        <path d="M5.74 14.1C5.53 13.52 5.42 12.88 5.42 12.25C5.42 11.62 5.53 10.98 5.74 10.4L2.03 7.82C1.04 9.77 0.5 12.06 0.5 14.5C0.5 16.94 1.04 19.23 2.03 21.18L5.74 18.6C5.17 17.31 4.9 15.77 4.9 14.1" fill="#FBBC05"/>
        <path d="M12.25 5.84C13.97 5.84 15.3 6.43 16.39 7.42L20.07 3.75C18.14 1.88 15.45 0.5 12.25 0.5C7.69 0.5 3.76 3.73 2.03 7.32L5.74 9.9C6.79 7.3 9.31 5.84 12.25 5.84Z" fill="#EA4335"/>
    </svg>
);

function AuthPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    
    const { login, switchRole } = useAuth();

    // Determine mode from URL
    useEffect(() => {
        setIsLogin(location.pathname === '/login');
    }, [location.pathname]);

    // Handle form input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Google Login Logic
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const toastId = toast.loading('Logging in with Google...');
            try {
                console.log("Google Token:", tokenResponse);
                // Send token to backend
                const res = await api.post('/auth/google', {
                    token: tokenResponse.access_token,
                });

                if (res.data) {
                    login(res.data);
                    toast.success('Google Login Successful!', { id: toastId });
                    
                    // Redirect logic (same as normal login)
                    const from = location.state?.from?.pathname;
                    const userRoles = res.data.roles || [];

                    if (from === '/list-your-room' && userRoles.includes('Landlord')) {
                        switchRole('landlord');
                        navigate('/landlord/overview', { replace: true });
                    } else if (from) {
                        navigate(from, { replace: true });
                    } else {
                        navigate('/');
                    }
                }
            } catch (error) {
                console.error("Google Auth Error:", error);
                toast.error('Google Login Failed', { id: toastId });
            }
        },
        onError: () => toast.error('Google Login Failed'),
    });

    // Handle form submission (Email/Password)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Processing...');
        try {
            if (isLogin) {
                // --- Login Logic ---
                const { data } = await api.post('/auth/login', {
                    email: formData.email,
                    password: formData.password,
                });
                
                login(data);
                toast.success('Login successful!', { id: toastId });
                
                const from = location.state?.from?.pathname;
                const userRoles = data.roles || [];

                // Smart redirect logic
                if (from === '/list-your-room' && userRoles.includes('Landlord')) {
                    switchRole('landlord');
                    navigate('/landlord/overview', { replace: true });
                    return;
                }
                if (from) {
                    navigate(from, { replace: true });
                    return;
                }
                if (userRoles.includes('Admin')) {
                    navigate('/admin/dashboard');
                } else if (userRoles.includes('Landlord')) {
                    switchRole('landlord');
                    navigate('/landlord/overview');
                } else {
                    navigate('/');
                }

            } else { 
                // --- Signup Logic ---
                await api.post('/auth/register', formData);
                toast.success('Registration successful! Please log in.', { id: toastId });
                navigate('/login');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || (isLogin ? 'Login failed.' : 'Registration failed.'), { id: toastId });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-poppins">
            {/* The form is now a centered card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full p-8 sm:p-12">
                
                {/* Logo added at the top for branding */}
                <div className="text-center mb-8">
                    <Link to="/" className="text-3xl font-bold text-red-500">
                        RoomRadar
                    </Link>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>

                {/* Social Login Button */}
                <div className="space-y-4">
                    <button 
                        type="button" //  Important: type="button" prevents form submit
                        onClick={() => handleGoogleLogin()} //  Attached handler here
                        className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>
                </div>

                {/* "OR" Divider */}
                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 flex-shrink text-sm text-gray-500">or</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Auth Form (Email/Password) */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -20 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -20 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="relative"
                            >
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><User /></span>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required className="w-full p-3 pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Mail /></span>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email address" required className="w-full p-3 pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Lock /></span>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required className="w-full p-3 pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    
                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105">
                            <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                                {isLogin ? <LogIn className="h-5 w-5 opacity-70" /> : <UserPlus className="h-5 w-5 opacity-70" />}
                            </span>
                            {isLogin ? 'Log in' : 'Create account'}
                        </button>
                    </div>
                </form>
                
                {/* Toggle link */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <Link to={isLogin ? '/signup' : '/login'} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 transition-colors">
                        {isLogin ? 'Sign up' : 'Log in'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default AuthPage;