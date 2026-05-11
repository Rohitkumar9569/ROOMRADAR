import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);
const ADMIN_ROLES = ['Admin', 'Super_Admin', 'Moderator', 'Support'];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole') || 'student');

    const persistUser = (nextUser) => {
        if (!nextUser) return;
        setUser(nextUser);
        localStorage.setItem('userInfo', JSON.stringify(nextUser));
    };

    const refreshUser = async () => {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (!storedUserInfo) return null;

        try {
            const storedUser = JSON.parse(storedUserInfo);
            if (!storedUser?.token) return null;
            api.defaults.headers.common['Authorization'] = `Bearer ${storedUser.token}`;
            const { data } = await api.get('/users/me');
            const freshUser = { ...storedUser, ...(data.user || {}), token: storedUser.token };
            persistUser(freshUser);
            return freshUser;
        } catch (error) {
            return null;
        }
    };

    //  (fetchNotifications, useEffect hooks, switchRole )

    const fetchNotifications = async () => {
        if (!api.defaults.headers.common['Authorization']) return;
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) {
            setNotifications([]);
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
                refreshUser();
            }
        } catch (error) {
            localStorage.removeItem('userInfo');
        } finally {
            setIsAuthLoading(false);
        }
    }, []);

    const login = (data) => {
        localStorage.setItem('userInfo', JSON.stringify(data));
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        persistUser(data);
        fetchNotifications();

        const roles = Array.isArray(data.roles) ? data.roles : [data.role].filter(Boolean);
        if (roles.some((role) => ADMIN_ROLES.includes(role))) {
            switchRole('admin');
        } else if (roles.includes('Landlord')) {
            switchRole('landlord');
        } else {
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
        const nextUser = { ...(user || {}), ...(updatedUserData || {}) };
        persistUser(nextUser);
    };
    const addToWishlist = async (roomId) => {
        if (!user) return;
        try {
            const { data } = await api.post('/users/wishlist', { roomId });
            updateUser(data.user);
        } catch (error) { /* keep wishlist state unchanged */ }
    };
    const removeFromWishlist = async (roomId) => {
        if (!user) return;
        try {
            const { data } = await api.delete(`/users/wishlist/${roomId}`);
            updateUser(data.user);
        } catch (error) { /* keep wishlist state unchanged */ }
    };

    const value = { 
        user, isAuthLoading, login, logout, updateUser, 
        notifications, activeRole, switchRole,
        addToWishlist, removeFromWishlist, refreshUser
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
