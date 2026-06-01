// client/src/context/SocketContext.jsx

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from '../api';
import { SOCKET_URL } from '../config/env';
import { connectSocketAfterMount, socketOptions } from '../config/socketOptions';
import {
    isCurrentPageTarget,
    primeRoomRadarNotifications,
    showRoomRadarNotification,
    syncRoomRadarPushSubscription
} from '../utils/browserNotifications';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user, activeRole, refreshUser } = useAuth();
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const socket = useRef();
    const userId = user?._id;

    const refreshUnreadConversationCount = useCallback(async () => {
        if (!userId) {
            setUnreadNotificationCount(0);
            return;
        }

        try {
            const { data } = await api.get('/conversations/unread-count');
            setUnreadNotificationCount(Number(data.count) || 0);
        } catch (error) {
            setUnreadNotificationCount(0);
        }
    }, [userId]);

    // Effect for fetching the initial count
    useEffect(() => {
        refreshUnreadConversationCount();
    }, [refreshUnreadConversationCount]);

    // Effect for managing the socket connection and listeners
    useEffect(() => {
        if (user) {
            const cleanupNotificationPrimer = primeRoomRadarNotifications();
            syncRoomRadarPushSubscription();
            // Establish connection
            const nextSocket = io(SOCKET_URL, socketOptions);
            socket.current = nextSocket;
            const cleanupSocket = connectSocketAfterMount(nextSocket);

            // Register user as online
            nextSocket.emit("setup", user._id);
            nextSocket.emit("addUser", user._id);

            const getInboxBasePath = () => {
                if (activeRole === 'landlord' || window.location.pathname.startsWith('/landlord')) return '/landlord/inbox';
                return '/profile/inbox';
            };

            const getSenderTitle = (payload = {}) => {
                if (payload.messageType === 'admin_update') return 'RoomRadar Admin';
                return payload.senderName || payload.sender?.name || 'New RoomRadar message';
            };

            const getMessageBody = (payload = {}) => {
                if (payload.messageType === 'booking_request') {
                    return payload.text || `New booking request${payload.roomTitle ? ` for ${payload.roomTitle}` : ''}.`;
                }
                return payload.text || payload.message || 'You have a new message.';
            };

            const showInboxToast = ({ title = 'RoomRadar', body = 'You have a new update.', link = getInboxBasePath(), tag = 'roomradar-inbox-toast' }) => {
                toast.custom((toastState) => (
                    <button
                        type="button"
                        onClick={() => {
                            toast.dismiss(toastState.id);
                            window.location.assign(link);
                        }}
                        className={`${toastState.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex w-[min(92vw,23rem)] items-center gap-3 rounded-[1.15rem] border border-slate-200/80 bg-white/96 p-3 text-left text-slate-950 shadow-[0_18px_46px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/96 dark:text-white`}
                    >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-sm font-black text-white shadow-lg shadow-[0_12px_24px_-18px_rgba(0,168,132,0.75)]">
                            RR
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-black leading-tight">{title}</span>
                            <span className="mt-0.5 block rr-line-clamp-2 text-[12px] font-semibold leading-4 text-slate-600 dark:text-slate-300">{body}</span>
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-[#e7fce3] px-2.5 py-1 text-[10px] font-black uppercase text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]">
                            Inbox
                        </span>
                    </button>
                ), {
                    id: tag,
                    duration: 5200,
                    position: 'top-center',
                });
            };

            const notifyInbox = (notificationOptions, toastOptions) => {
                showRoomRadarNotification(notificationOptions).then((shown) => {
                    if (!shown) showInboxToast(toastOptions);
                });
            };

            // Listen for new notifications from the server
            nextSocket.on("newNotification", (notification = {}) => {
                refreshUnreadConversationCount();
                if (notification.metadata?.conversation) return;

                const link = notification.link || '/profile/inbox';
                if (isCurrentPageTarget(link)) return;

                const title = notification.title || 'RoomRadar update';
                const body = notification.message || 'You have a new RoomRadar update.';
                const tag = `roomradar-notification-${notification._id || notification.type || Date.now()}`;

                notifyInbox({
                    title,
                    body,
                    url: link,
                    tag,
                    data: {
                        notificationId: notification._id,
                        type: notification.type || 'general',
                    },
                }, {
                    title,
                    body,
                    link,
                    tag,
                });
            });

            nextSocket.on("unread_count_update", ({ count }) => {
                setUnreadNotificationCount(Number(count) || 0);
            });

            nextSocket.on("getMessage", (payload = {}) => {
                if (payload.senderId?.toString() === user._id?.toString()) return;

                refreshUnreadConversationCount();

                const conversationId = payload.conversationId?.toString();
                const link = payload.link || (conversationId ? `${getInboxBasePath()}/${conversationId}` : getInboxBasePath());
                if (isCurrentPageTarget(link)) return;

                const title = getSenderTitle(payload);
                const body = getMessageBody(payload);
                const tag = conversationId ? `roomradar-chat-${conversationId}` : 'roomradar-chat';

                notifyInbox({
                    title,
                    body,
                    url: link,
                    tag,
                    data: {
                        type: 'message',
                        conversationId,
                        senderId: payload.senderId,
                    },
                }, {
                    title,
                    body,
                    link,
                    tag,
                });
            });

            nextSocket.on("bookingStatusUpdated", ({ status, applicationId }) => {
                if (!status) return;
                const isHostRoute = activeRole === 'landlord' || window.location.pathname.startsWith('/landlord');
                const link = isHostRoute ? '/landlord/applications' : '/profile/my-applications';
                if (isCurrentPageTarget(link)) return;

                const statusCopy = String(status).replace(/[_-]/g, ' ');
                const title = 'Booking update';
                const body = `Your booking request is now ${statusCopy}.`;
                const tag = applicationId ? `roomradar-booking-${applicationId}` : `roomradar-booking-${status}`;

                notifyInbox({
                    title,
                    body,
                    url: link,
                    tag,
                    data: {
                        type: 'booking',
                        applicationId,
                        status,
                    },
                }, {
                    title,
                    body,
                    link,
                    tag,
                });
            });

            nextSocket.on("user_profile_updated", () => {
                refreshUser();
            });

            // Cleanup on component unmount or user logout
            return () => {
                cleanupNotificationPrimer();
                cleanupSocket();
                if (socket.current === nextSocket) {
                    socket.current = undefined;
                }
            };
        }
        return undefined;
    }, [user, activeRole, refreshUnreadConversationCount, refreshUser]);

    const value = useMemo(() => ({
        socket: socket.current,
        unreadNotificationCount,
        setUnreadNotificationCount,
        refreshUnreadConversationCount
    }), [unreadNotificationCount, refreshUnreadConversationCount]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
