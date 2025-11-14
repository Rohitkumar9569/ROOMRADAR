// client/src/context/SocketContext.jsx

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const socket = useRef();

    // Effect for fetching the initial count
    useEffect(() => {
        const fetchInitialCount = async () => {
            if (user) {
                try {
                    const { data } = await api.get('/notifications/unread-count');
                    setUnreadNotificationCount(data.count);
                } catch (error) {
                    console.error("Failed to fetch unread count:", error);
                }
            } else {
                setUnreadNotificationCount(0);
            }
        };
        fetchInitialCount();
    }, [user]);

    // Effect for managing the socket connection and listeners
    useEffect(() => {
        if (user) {
            // Establish connection
            socket.current = io("http://localhost:5000");

            // Register user as online
            socket.current.emit("addUser", user._id);

            // Listen for new notifications from the server
            socket.current.on("newNotification", (notification) => {
                setUnreadNotificationCount((prevCount) => prevCount + 1);
                // Optional: show a toast notification
                // toast.success(notification.title);
            });

            // Cleanup on component unmount or user logout
            return () => {
                socket.current.disconnect();
            };
        }
    }, [user]);

    const value = {
        socket: socket.current,
        unreadNotificationCount,
        setUnreadNotificationCount // Allow components to reset count, e.g., after reading messages
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};