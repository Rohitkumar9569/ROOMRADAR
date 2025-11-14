import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole') || 'student');

    //  (fetchNotifications, useEffect hooks, switchRole )

    const fetchNotifications = async () => {
        if (!api.defaults.headers.common['Authorization']) return;
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };
    useEffect(() => {
        localStorage.setItem('activeRole', activeRole);
    }, [activeRole]);
    const switchRole = (newRole) => {
        setActiveRole(newRole);
    };
    useEffect(() => {
        try {
            const storedUserInfo = localStorage.getItem('userInfo');
            if (storedUserInfo) {
                const userData = JSON.parse(storedUserInfo);
                api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
                setUser(userData);
                fetchNotifications(); 
            }
        } catch (error) {
            console.error("Failed to parse user info from localStorage", error);
            localStorage.removeItem('userInfo');
        } finally {
            setIsAuthLoading(false);
        }
    }, []);

    const login = (data) => {
        localStorage.setItem('userInfo', JSON.stringify(data));
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        setUser(data);
        fetchNotifications();

        // This logic is now in AuthPage, but we can set a default role here
        if (data.roles && !data.roles.includes('Landlord')) {
            switchRole('student');
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('activeRole');
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
        setNotifications([]);
        
        // Reset the activeRole state to its default when logging out.
        setActiveRole('student');
    };

    //(updateUser, addToWishlist, removeFromWishlist functions )
    const updateUser = (updatedUserData) => {
        setUser(updatedUserData);
        localStorage.setItem('userInfo', JSON.stringify(updatedUserData));
    };
    const addToWishlist = async (roomId) => {
        if (!user) return;
        try {
            const { data } = await api.post('/users/wishlist', { roomId });
            updateUser(data.user);
        } catch (error) { console.error("Failed to add to wishlist:", error); }
    };
    const removeFromWishlist = async (roomId) => {
        if (!user) return;
        try {
            const { data } = await api.delete(`/users/wishlist/${roomId}`);
            updateUser(data.user);
        } catch (error) { console.error("Failed to remove from wishlist:", error); }
    };

    const value = { 
        user, isAuthLoading, login, logout, updateUser, 
        notifications, activeRole, switchRole,
        addToWishlist, removeFromWishlist
    };

    return (
        <AuthContext.Provider value={value}>
            {!isAuthLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};