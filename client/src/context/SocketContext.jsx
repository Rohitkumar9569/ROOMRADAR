// client/src/context/SocketContext.jsx

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api';
import { SOCKET_URL } from '../config/env';

const SocketContext = createContext();
const socketTransports = ['websocket'];

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user, refreshUser } = useAuth();
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const socket = useRef();

    const refreshUnreadConversationCount = async () => {
        if (!user) {
            setUnreadNotificationCount(0);
            return;
        }

        try {
            const { data } = await api.get('/conversations/unread-count');
            setUnreadNotificationCount(Number(data.count) || 0);
        } catch (error) {
            setUnreadNotificationCount(0);
        }
    };

    // Effect for fetching the initial count
    useEffect(() => {
        refreshUnreadConversationCount();
    }, [user?._id]);

    // Effect for managing the socket connection and listeners
    useEffect(() => {
        if (user) {
            // Establish connection
            socket.current = io(SOCKET_URL, {
                transports: socketTransports,
                reconnectionAttempts: 5,
                timeout: 10000,
            });

            // Register user as online
            socket.current.emit("setup", user._id);
            socket.current.emit("addUser", user._id);

            // Listen for new notifications from the server
            socket.current.on("newNotification", () => {
                refreshUnreadConversationCount();
            });

            socket.current.on("unread_count_update", ({ count }) => {
                setUnreadNotificationCount(Number(count) || 0);
            });

            socket.current.on("user_profile_updated", () => {
                refreshUser();
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
