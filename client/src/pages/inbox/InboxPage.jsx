import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    CheckBadgeIcon,
    ClockIcon,
    DocumentTextIcon,
    EllipsisVerticalIcon,
    HomeModernIcon,
    InboxIcon,
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import ActionBlock from '../../components/features/chat/ActionBlock';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';
import { connectSocketAfterMount, socketOptions } from '../../config/socketOptions';
import { useUI } from '../../context/UIContext';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
import { readScroll, saveScroll } from '../../utils/scrollStore';

const FILTERS_BY_ROLE = {
    landlord: ['All', 'Admin', 'Requests', 'Inquiries', 'Upcoming', 'Archived'],
    student: ['All', 'Upcoming', 'Archived'],
};

const QUICK_REPLIES = {
    landlord: [
        'Thanks for reaching out. I can share more details.',
        'The room is available for your selected dates.',
        'Please share your move-in preference and occupant details.',
    ],
    student: [
        'Thanks, I am interested in this room.',
        'Can we schedule a visit this week?',
        'Could you share rent and amenities?',
    ],
};
const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
    approved: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20',
    confirmed: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    rejected: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20',
    cancelled: 'bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-200 dark:ring-zinc-400/20',
    inquiry: 'bg-cyan-100 text-cyan-800 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-400/20',
    booking: 'bg-cyan-100 text-cyan-800 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-400/20',
    admin_update: 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-100 dark:ring-violet-400/25',
};

const getOtherMember = (convo, currentUser) => convo?.members?.find((member) => member._id !== currentUser?._id);

const ADMIN_ROLES = ['Admin', 'Super_Admin', 'Moderator', 'Support'];
const ADMIN_REVIEW_TEXT_PATTERN = /\b(roomradar review|listing approved|listing needs changes|review update|approved and is now live|was not approved|edit and resubmit)\b/i;

const isAdminLikeMember = (member) => {
    if (!member) return false;
    const roles = Array.isArray(member.roles) ? member.roles : [];
    const name = String(member.name || '').trim().toLowerCase();
    const email = String(member.email || '').trim().toLowerCase();
    return (
        roles.some((role) => ADMIN_ROLES.includes(role)) ||
        ['admin', 'roomradar admin', 'admin center'].includes(name) ||
        email.includes('admin@') ||
        email.includes('@roomradar')
    );
};

const isAdminConversation = (convo) => {
    const hasAdminMember = convo?.members?.some(isAdminLikeMember);
    const lastText = String(convo?.lastMessage?.text || '');
    return (
        convo?.conversationType === 'admin_update' ||
        convo?.lastMessage?.messageType === 'admin_update' ||
        ADMIN_REVIEW_TEXT_PATTERN.test(lastText) ||
        (hasAdminMember && !convo?.application)
    );
};

const getConversationDisplayMember = (convo, currentUser) => {
    const otherMember = getOtherMember(convo, currentUser);
    if (isAdminConversation(convo)) {
        return {
            _id: otherMember?._id || 'roomradar-admin',
            name: 'RoomRadar Admin',
            avatarUrl: otherMember?.avatarUrl || otherMember?.profilePicture,
        };
    }
    return otherMember;
};

const getConversationRoomTitle = (convo) => {
    if (isAdminConversation(convo)) return convo.room?.title ? `Review update - ${convo.room.title}` : 'Room review update';
    return convo.room?.title || 'General Inquiry';
};

const getConversationStatus = (convo) => {
    if (isAdminConversation(convo)) return 'admin_update';
    return convo.application?.status || convo.conversationType;
};

const getConversationTypeLabel = (convo) => {
    if (isAdminConversation(convo)) return 'Admin';
    return convo.conversationType === 'booking' ? 'Booking' : 'Inquiry';
};

const getConversationRequestLabel = (convo) => {
    if (isAdminConversation(convo)) return 'Admin review update';
    return convo.conversationType === 'booking' ? 'Booking request' : 'Room inquiry';
};

const getConversationPreview = (convo) => {
    if (convo.lastMessage?.text) return convo.lastMessage.text;
    if (convo.lastMessage?.messageType) return convo.lastMessage.messageType.replace('_', ' ');
    if (convo.conversationType === 'booking') return 'Booking conversation started';
    if (isAdminConversation(convo)) return 'RoomRadar review update';
    return 'No messages yet';
};

const getStatusBadge = (status) => {
    if (!status) return null;
    const statusKey = status.toLowerCase();
    const label = statusKey === 'admin_update' ? 'Admin update' : status.replace(/_/g, ' ');

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ${STATUS_STYLES[statusKey] || STATUS_STYLES.booking}`}>
            {label}
        </span>
    );
};

const areChatMetaEqual = (left, right) => {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return (
        left.name === right.name &&
        left.avatarUrl === right.avatarUrl &&
        left.subtitle === right.subtitle &&
        left.isOnline === right.isOnline &&
        left.roomTitle === right.roomTitle &&
        left.statusLabel === right.statusLabel &&
        left.typeLabel === right.typeLabel
    );
};

const ScrollStrip = ({ children, className = '' }) => (
    <div className={`flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
        {children}
    </div>
);

const ConversationCard = ({ convo, onClick, isSelected, currentUser, isOnline }) => {
    const displayMember = getConversationDisplayMember(convo, currentUser);
    if (!displayMember) return null;

    const lastMessageDate = convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : null;
    const isAdmin = isAdminConversation(convo);
    const roomTitle = getConversationRoomTitle(convo);
    const status = getConversationStatus(convo);
    const unreadCount = Number(convo.unreadCount || 0);
    const avatarUrl = displayMember.avatarUrl || displayMember.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayMember.name)}`;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`group min-h-[72px] w-full border-b border-[#e9edef] px-3 py-2 text-left transition dark:border-[#26343d] sm:px-4 ${
                isSelected
                    ? 'bg-[#e9edef] dark:bg-[#2a3942]'
                    : 'bg-transparent hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
            }`}
        >
            <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                    <img
                        src={avatarUrl}
                        alt={displayMember.name}
                        className="h-11 w-11 rounded-full object-cover sm:h-12 sm:w-12"
                    />
                    <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f0f2f5] dark:border-[#111b21] ${
                            isAdmin ? 'bg-violet-400' : isOnline ? 'bg-[#00a884]' : convo.application?.status === 'pending' ? 'bg-amber-400' : 'bg-[#8696a0]'
                        }`}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-[#111b21] dark:text-[#e9edef] sm:text-[15px]">{displayMember.name}</p>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                            {lastMessageDate && (
                                <span className="text-[11px] font-semibold text-[#667781] dark:text-[#8696a0]">
                                    {formatDistanceToNow(lastMessageDate, { addSuffix: true })}
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-black text-white shadow-sm">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="mt-0.5 truncate text-[11px] font-bold text-cyan-700 dark:text-[#00a884] sm:text-xs">{roomTitle}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-[#667781] dark:text-[#8696a0] sm:text-[13px]">{getConversationPreview(convo)}</p>

                    <div className="mt-1.5 flex max-w-full items-center gap-1.5 overflow-hidden">
                        {getStatusBadge(status)}
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f2f5] px-2 py-0.5 text-[10px] font-bold capitalize text-[#667781] dark:bg-[#202c33] dark:text-[#aebac1]">
                            {convo.conversationType === 'booking' ? <CalendarDaysIcon className="h-3.5 w-3.5" /> : <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />}
                            {getConversationTypeLabel(convo)}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
};

const MessageBubble = ({ message, isOwnMessage }) => {
    const sentAt = message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : '';

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[75%] flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div
                    className={`relative rounded-2xl px-3.5 py-2 shadow-sm after:absolute after:top-0 after:h-3 after:w-3 ${
                        isOwnMessage
                            ? 'rounded-tr-sm bg-brand text-white after:-right-1 after:bg-brand dark:bg-[#005c4b] dark:text-[#e9edef] dark:after:bg-[#005c4b]'
                            : 'rounded-tl-sm bg-light-card text-light-text after:-left-1 after:bg-light-card dark:bg-[#1f2c34] dark:text-[#e9edef] dark:after:bg-[#1f2c34]'
                    }`}
                >
                    <p
                        className="whitespace-pre-wrap break-all text-[15px] leading-6 [overflow-wrap:anywhere]"
                        style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                    >
                        {message.text}
                    </p>
                    {sentAt && (
                        <span className={`ml-3 mt-1 block text-right text-[10px] font-medium ${isOwnMessage ? 'text-white/70' : 'text-light-muted dark:text-[#8696a0]'}`}>
                            {sentAt}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon, title, message }) => (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-[#667781] dark:text-[#8696a0]">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#e9edef] text-[#00a884] dark:bg-[#202c33]">
            {icon}
        </div>
        <h2 className="text-xl font-extrabold text-[#111b21] dark:text-[#e9edef]">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6">{message}</p>
    </div>
);

const DetailRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;

    return (
        <div className="flex items-start gap-3 rounded-xl bg-[#f0f2f5] p-3 dark:bg-[#111b21]">
            <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#00a884]" />
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">{label}</p>
                <p className="break-words text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">{value}</p>
            </div>
        </div>
    );
};

const ContactInfoDrawer = ({ isOpen, onClose, conversation, currentUser, isLandlordView, isOnline }) => {
    const displayMember = getConversationDisplayMember(conversation, currentUser);
    if (!conversation || !displayMember) return null;

    const application = conversation.application;
    const room = conversation.room;
    const isAdmin = isAdminConversation(conversation);
    const applicationDates = [application?.checkInDate, application?.checkOutDate]
        .filter(Boolean)
        .map((date) => format(new Date(date), 'dd MMM yyyy'))
        .join(' - ');
    const avatarUrl = displayMember.avatarUrl || displayMember.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayMember.name)}`;

    return (
        <div className={`absolute inset-0 z-40 flex justify-end transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <button
                type="button"
                aria-label="Close contact info"
                onClick={onClose}
                className={`hidden flex-1 bg-black/30 transition-opacity md:block ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            />
            <aside
                className={`h-full w-full max-w-full bg-[#f0f2f5] shadow-2xl transition-transform duration-300 dark:bg-[#111b21] md:w-[390px] ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center gap-3 bg-[#202c33] px-4 text-white">
                        <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10" title="Close">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                        <h3 className="text-base font-bold">Contact info</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <section className="bg-white px-6 py-8 text-center dark:bg-[#111b21]">
                            <img
                                src={avatarUrl}
                                alt={displayMember.name}
                                className="mx-auto h-32 w-32 rounded-full object-cover shadow-lg"
                            />
                            <h2 className="mt-4 truncate text-2xl font-extrabold text-[#111b21] dark:text-[#e9edef]">{displayMember.name}</h2>
                            <p className="mt-1 text-sm font-semibold text-[#667781] dark:text-[#8696a0]">{isAdmin ? 'RoomRadar review desk' : isLandlordView ? 'Applicant conversation' : 'Host conversation'}</p>
                            <p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                                isAdmin
                                    ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-100'
                                    : isOnline
                                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                                    : 'bg-[#f0f2f5] text-[#667781] dark:bg-[#202c33] dark:text-[#aebac1]'
                            }`}>
                                <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-violet-400' : isOnline ? 'bg-[#00a884]' : 'bg-[#8696a0]'}`} />
                                {isAdmin ? 'Admin updates' : isOnline ? 'Active now' : 'Recently active'}
                            </p>
                            <div className="mt-4 flex justify-center">{getStatusBadge(getConversationStatus(conversation))}</div>
                        </section>

                        <section className="mt-3 bg-white p-4 dark:bg-[#111b21]">
                            <div className="space-y-3">
                                <DetailRow icon={HomeModernIcon} label="Room" value={room?.title || 'General inquiry'} />
                                <DetailRow icon={DocumentTextIcon} label="Request" value={getConversationRequestLabel(conversation)} />
                                <DetailRow icon={CalendarDaysIcon} label="Stay Dates" value={applicationDates} />
                                <DetailRow icon={ClockIcon} label="Last Updated" value={conversation.lastMessage?.createdAt ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true }) : null} />
                            </div>
                        </section>

                        <section className="mt-3 bg-white p-4 dark:bg-[#111b21]">
                            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-[#00a884]/25 dark:bg-[#005c4b]/35">
                                <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-800 dark:text-cyan-100">
                                    <SparklesIcon className="h-5 w-5" />
                                    Smart follow-up
                                </div>
                                <p className="mt-2 text-sm leading-6 text-cyan-800 dark:text-cyan-50">
                                    Keep responses short, confirm the next step, and keep payment conversations inside RoomRadar.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
};

const InboxPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const {
        searchTerm,
        setSearchTerm,
        setActiveChatName,
        setActiveChatMeta,
        inboxSearchInNav,
        setInboxListScrolled,
    } = useOutletContext();
    const { chatProfileOpen, setChatProfileOpen } = useUI();
    const location = useLocation();
    const isLandlordView = location.pathname.startsWith('/landlord');
    const roleKey = isLandlordView ? 'landlord' : 'student';
    const inboxListScrollKey = `inbox:${roleKey}:list-scroll`;
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const conversationsCacheKey = `inbox:${roleKey}:conversations`;
    const cachedConversations = readTabCache(conversationsCacheKey)?.value;
    const [allConversations, setAllConversations] = useState(() => cachedConversations?.conversations || []);
    const [messages, setMessages] = useState(() => (
        conversationId ? readTabCache(`inbox:${roleKey}:messages:${conversationId}`)?.value?.messages || [] : []
    ));
    const [loading, setLoading] = useState(() => !cachedConversations);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const messagesEndRef = useRef(null);
    const conversationListRef = useRef(null);
    const socket = useRef();
    const conversationIdRef = useRef(conversationId);
    const currentUserIdRef = useRef(currentUser?._id);
    const selectedConversation = useMemo(() => allConversations.find((c) => c._id === conversationId), [allConversations, conversationId]);

    useEffect(() => {
        conversationIdRef.current = conversationId;
        currentUserIdRef.current = currentUser?._id;
    }, [conversationId, currentUser?._id]);

    useEffect(() => {
        if (!currentUser?._id) return undefined;

        const nextSocket = io(SOCKET_URL, socketOptions);
        socket.current = nextSocket;
        const cleanupSocket = connectSocketAfterMount(nextSocket);

        nextSocket.on('getMessage', (data) => {
            if (data.conversationId === conversationIdRef.current && data.senderId !== currentUserIdRef.current) {
                setMessages((prev) => {
                    const nextMessages = [
                        ...prev,
                        {
                            _id: data._id || `socket-${data.senderId}-${Date.now()}`,
                            ...data,
                            sender: { _id: data.senderId },
                            createdAt: new Date().toISOString(),
                        },
                    ];
                    setTabCache(`inbox:${roleKey}:messages:${data.conversationId}`, { messages: nextMessages });
                    return nextMessages;
                });
            }
        });

        nextSocket.on('getUsers', (users = []) => {
            setOnlineUserIds(users.map((id) => id?.toString()));
        });

        return () => {
            cleanupSocket();
            if (socket.current === nextSocket) {
                socket.current = null;
            }
        };
    }, [currentUser?._id, roleKey]);

    useEffect(() => {
        if (currentUser && socket.current) {
            socket.current.emit('setup', currentUser._id);
            socket.current.emit('addUser', currentUser._id);
        }
    }, [currentUser]);

    useEffect(() => {
        setChatProfileOpen(false);
    }, [conversationId, setChatProfileOpen]);

    useEffect(() => {
        setInboxListScrolled?.(false);
        return () => setInboxListScrolled?.(false);
    }, [setInboxListScrolled]);

    const applyActiveChatMeta = useCallback((nextMeta) => {
        if (setActiveChatMeta) {
            setActiveChatMeta((prev) => (areChatMetaEqual(prev, nextMeta) ? prev : nextMeta));
            return;
        }

        setActiveChatName?.(nextMeta?.name || null);
    }, [setActiveChatMeta, setActiveChatName]);

    useEffect(() => {
        let nextMeta = null;

        if (selectedConversation) {
            const displayMember = getConversationDisplayMember(selectedConversation, currentUser);
            const isAdmin = isAdminConversation(selectedConversation);
            const isOnline = !isAdmin && onlineUserIds.includes(displayMember?._id?.toString());
            const roomTitle = getConversationRoomTitle(selectedConversation);
            const statusLabel = isAdmin
                ? 'Admin update'
                : selectedConversation.application?.status || (selectedConversation.conversationType === 'booking' ? 'Request' : 'Inquiry');
            nextMeta = displayMember ? {
                name: displayMember.name,
                avatarUrl: displayMember.avatarUrl || displayMember.profilePicture,
                isOnline,
                roomTitle,
                statusLabel,
                typeLabel: getConversationTypeLabel(selectedConversation),
                subtitle: isAdmin ? roomTitle : `${isOnline ? 'Active now' : 'Recently active'} - ${roomTitle}`,
            } : null;
        }

        applyActiveChatMeta(nextMeta);
        return () => applyActiveChatMeta(null);
    }, [selectedConversation, currentUser?._id, onlineUserIds, applyActiveChatMeta]);

    const fetchConversations = useCallback(async ({ silent = false } = {}) => {
        const endpoint = isLandlordView ? '/chat/conversations/as-landlord' : '/chat/conversations/as-student';
        const cached = readTabCache(conversationsCacheKey)?.value;

        if (!silent && cached) {
            setAllConversations(cached.conversations || []);
            setLoading(false);
        } else if (!silent) {
            setLoading(true);
        }

        try {
            const { data } = await api.get(endpoint);
            setTabCache(conversationsCacheKey, { conversations: data });
            setAllConversations(data);
        } catch (error) {
            if (!silent && !cached) toast.error('Failed to fetch conversations.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [conversationsCacheKey, isLandlordView]);

    const fetchMessages = useCallback(async (id) => {
        if (!id) return;
        const messagesCacheKey = `inbox:${roleKey}:messages:${id}`;
        const cached = readTabCache(messagesCacheKey)?.value;

        if (cached) {
            setMessages(cached.messages || []);
            setLoadingMessages(false);
        } else {
            setLoadingMessages(true);
        }

        try {
            const { data } = await api.get(`/chat/messages/${id}`);
            setTabCache(messagesCacheKey, { messages: data });
            setMessages(data);
            await api.patch(`/chat/conversations/${id}/read`);
            fetchConversations({ silent: true });
        } catch (error) {
            if (!cached) toast.error('Failed to fetch messages.');
        } finally {
            setLoadingMessages(false);
        }
    }, [fetchConversations, roleKey]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        fetchMessages(conversationId);
    }, [conversationId, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleConversationClick = (convoId) => {
        const basePath = isLandlordView ? '/landlord' : '/profile';
        navigate(`${basePath}/inbox/${convoId}`);
    };

    const handleSendMessage = async (event) => {
        event.preventDefault();
        const text = newMessage.trim();
        if (!text || !conversationId || !selectedConversation || isSending) return;

        const otherMember = getOtherMember(selectedConversation, currentUser);
        if (!otherMember) return;

        setIsSending(true);
        const tempId = `temp-${Date.now()}`;

        const messagesCacheKey = `inbox:${roleKey}:messages:${conversationId}`;
        setMessages((prev) => {
            const nextMessages = [
                ...prev,
                {
                    _id: tempId,
                    text,
                    sender: { _id: currentUser._id },
                    createdAt: new Date().toISOString(),
                },
            ];
            setTabCache(messagesCacheKey, { messages: nextMessages });
            return nextMessages;
        });
        setNewMessage('');

        try {
            const { data: savedMessage } = await api.post('/chat/messages', { conversationId, text });
            setMessages((prev) => {
                const nextMessages = prev.map((message) => (message._id === tempId ? savedMessage : message));
                setTabCache(messagesCacheKey, { messages: nextMessages });
                return nextMessages;
            });
            setAllConversations((prev) => {
                const nextConversations = prev.map((convo) => (
                    convo._id === conversationId
                        ? { ...convo, lastMessage: { text, createdAt: savedMessage.createdAt, messageType: 'text' } }
                        : convo
                ));
                setTabCache(conversationsCacheKey, { conversations: nextConversations });
                return nextConversations;
            });
            fetchConversations({ silent: true });
        } catch (error) {
            toast.error('Failed to save message.');
            setNewMessage(text);
            setMessages((prev) => {
                const nextMessages = prev.filter((message) => message._id !== tempId);
                setTabCache(messagesCacheKey, { messages: nextMessages });
                return nextMessages;
            });
        } finally {
            setIsSending(false);
        }
    };

    const filterCounts = useMemo(() => {
        const counts = { All: allConversations.length, Admin: 0, Requests: 0, Inquiries: 0, Upcoming: 0, Archived: 0 };
        allConversations.forEach((convo) => {
            if (isAdminConversation(convo)) {
                counts.Admin += 1;
                return;
            }
            if (convo.conversationType === 'booking' && convo.application?.status === 'pending') counts.Requests += 1;
            if (convo.conversationType === 'inquiry') counts.Inquiries += 1;
            if (convo.conversationType === 'booking' && ['approved', 'confirmed'].includes(convo.application?.status)) counts.Upcoming += 1;
            if (convo.conversationType === 'booking' && ['rejected', 'cancelled'].includes(convo.application?.status)) counts.Archived += 1;
        });
        return counts;
    }, [allConversations]);

    const filteredConversations = useMemo(() => {
        let conversations = allConversations;

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            conversations = conversations.filter((convo) => {
                const otherMember = getConversationDisplayMember(convo, currentUser);
                return (
                    otherMember?.name?.toLowerCase().includes(lowercasedFilter) ||
                    convo.room?.title?.toLowerCase().includes(lowercasedFilter) ||
                    getConversationPreview(convo).toLowerCase().includes(lowercasedFilter)
                );
            });
        }

        switch (activeFilter) {
            case 'Admin':
                return conversations.filter((convo) => isAdminConversation(convo));
            case 'Requests':
                return conversations.filter((convo) => !isAdminConversation(convo) && convo.conversationType === 'booking' && convo.application?.status === 'pending');
            case 'Inquiries':
                return conversations.filter((convo) => !isAdminConversation(convo) && convo.conversationType === 'inquiry');
            case 'Upcoming':
                return conversations.filter((convo) => !isAdminConversation(convo) && convo.conversationType === 'booking' && ['approved', 'confirmed'].includes(convo.application?.status));
            case 'Archived':
                return conversations.filter((convo) => !isAdminConversation(convo) && convo.conversationType === 'booking' && ['rejected', 'cancelled'].includes(convo.application?.status));
            default:
                return conversations;
        }
    }, [allConversations, activeFilter, searchTerm, currentUser]);

    useEffect(() => {
        const listNode = conversationListRef.current;
        if (!listNode || loading) return undefined;

        const savedTop = readScroll(inboxListScrollKey);
        const frameId = window.requestAnimationFrame(() => {
            listNode.scrollTop = savedTop;
            setInboxListScrolled?.(savedTop > 56);
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            saveScroll(inboxListScrollKey, listNode.scrollTop);
        };
    }, [filteredConversations.length, inboxListScrollKey, loading, setInboxListScrolled]);

    const activeOtherMember = selectedConversation ? getConversationDisplayMember(selectedConversation, currentUser) : null;
    const activeConversationIsAdmin = selectedConversation ? isAdminConversation(selectedConversation) : false;
    const activeMemberOnline = activeOtherMember && !activeConversationIsAdmin ? onlineUserIds.includes(activeOtherMember._id?.toString()) : false;
    const filters = FILTERS_BY_ROLE[roleKey];
    const quickReplies = QUICK_REPLIES[roleKey];

    const handleConversationListScroll = (event) => {
        saveScroll(inboxListScrollKey, event.currentTarget.scrollTop);
        setInboxListScrolled?.(event.currentTarget.scrollTop > 56);
    };

    const ConversationListPanel = (
        <div className="flex h-full flex-col overflow-hidden border-r border-[#e9edef] bg-[#f7f6f3] dark:border-[#26343d] dark:bg-[#111b21]">
            <div className="flex-shrink-0 border-b border-[#e9edef]/80 bg-white/90 px-3 pb-2 pt-2 shadow-sm backdrop-blur-xl dark:border-[#26343d] dark:bg-[#111b21]/95 sm:px-4 sm:pb-3 md:pt-3">
                {!inboxSearchInNav && (
                    <label className="inbox-inline-search mb-2 flex md:hidden">
                        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm?.(event.target.value)}
                            placeholder="Search chats"
                        />
                    </label>
                )}
                <ScrollStrip className="pb-1">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            type="button"
                            onClick={() => setActiveFilter(filter)}
                            className={`rr-filter-chip inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold transition sm:gap-2 sm:px-3 sm:text-sm ${
                                activeFilter === filter
                                    ? 'bg-[#00a884] text-white shadow-sm'
                                    : 'bg-white text-[#54656f] ring-1 ring-[#e9edef] hover:text-[#111b21] dark:bg-[#1f2c34] dark:text-[#aebac1] dark:ring-[#2a3942]'
                            }`}
                        >
                            {filter}
                            <span className={`rr-filter-chip-count rounded-full px-2 py-0.5 text-[11px] ${activeFilter === filter ? 'bg-white/20 text-white' : 'bg-[#f0f2f5] dark:bg-[#202c33]'}`}>
                                {filterCounts[filter] || 0}
                            </span>
                        </button>
                    ))}
                </ScrollStrip>
            </div>

            <div ref={conversationListRef} onScroll={handleConversationListScroll} className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
                {loading ? (
                    <div className="flex h-full items-center justify-center"><Spinner /></div>
                ) : filteredConversations.length > 0 ? (
                    filteredConversations.map((convo) => (
                        <ConversationCard
                            key={convo._id}
                            convo={convo}
                            onClick={() => handleConversationClick(convo._id)}
                            isSelected={selectedConversation?._id === convo._id}
                            currentUser={currentUser}
                            isOnline={!isAdminConversation(convo) && onlineUserIds.includes(getOtherMember(convo, currentUser)?._id?.toString())}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={<InboxIcon className="h-11 w-11" />}
                        title="No conversations here"
                        message="Try another filter or search term. New requests and inquiries will appear here automatically."
                    />
                )}
            </div>
        </div>
    );

    const ChatWindowPanel = (
        <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-light-bg dark:bg-[#0b1014]">
            {selectedConversation ? (
                <>
                    <div className="hidden h-16 flex-shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-3 dark:border-[#26343d] dark:bg-[#202c33] sm:px-4 md:flex">
                        <button
                            type="button"
                            onClick={() => setChatProfileOpen(true)}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Open contact info"
                        >
                            <span className="relative flex h-10 w-10 flex-shrink-0">
                                <img
                                    src={activeOtherMember?.avatarUrl || activeOtherMember?.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(activeOtherMember?.name || 'RoomRadar Admin')}`}
                                    alt={activeOtherMember?.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f0f2f5] dark:border-[#202c33] ${activeConversationIsAdmin ? 'bg-violet-400' : activeMemberOnline ? 'bg-[#00a884]' : 'bg-[#8696a0]'}`} />
                            </span>
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-black text-[#111b21] dark:text-[#e9edef]">{activeOtherMember?.name}</h2>
                                <p className="truncate text-xs font-semibold text-[#667781] dark:text-[#8696a0]">
                                    {activeConversationIsAdmin ? getConversationRoomTitle(selectedConversation) : `${activeMemberOnline ? 'Active now' : 'Recently active'} - ${selectedConversation.room?.title || 'General Inquiry'}`}
                                </p>
                            </div>
                        </button>

                        <div className="flex items-center gap-1">
                            <span className="hidden items-center gap-1 rounded-full bg-[#d9fdd3] px-3 py-1.5 text-xs font-extrabold text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3] sm:inline-flex">
                                <CheckBadgeIcon className="h-4 w-4" />
                                Verified
                            </span>
                            <button
                                type="button"
                                onClick={() => setChatProfileOpen(true)}
                                className="rounded-full p-2 text-[#54656f] transition hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/5"
                                title="Contact info"
                            >
                                <EllipsisVerticalIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
                        <div className="mx-auto max-w-4xl space-y-3">
                            {loadingMessages ? (
                                <div className="flex h-72 items-center justify-center"><Spinner /></div>
                            ) : (
                                messages.map((message) => {
                                    if (message.messageType === 'booking_request') {
                                        return <ActionBlock key={message._id} message={message} onUpdateRequest={() => { fetchMessages(conversationId); fetchConversations(); }} />;
                                    }

                                    const isOwnMessage = message.sender?._id === currentUser?._id;
                                    return <MessageBubble key={message._id} message={message} isOwnMessage={isOwnMessage} />;
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <form onSubmit={handleSendMessage} className="flex-shrink-0 border-t border-light-border bg-light-card p-3 dark:border-dark-border dark:bg-[#1f2c34]">
                        <div className="mx-auto max-w-4xl">
                            <ScrollStrip className="mb-2 pb-1">
                                {quickReplies.map((reply) => (
                                    <button
                                        key={reply}
                                        type="button"
                                        onClick={() => setNewMessage(reply)}
                                        className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#54656f] ring-1 ring-[#e9edef] transition hover:text-[#008069] dark:bg-[#111b21] dark:text-[#aebac1] dark:ring-[#2a3942] dark:hover:text-[#00a884]"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </ScrollStrip>

                            <div className="flex items-end gap-2">
                                <textarea
                                    rows={1}
                                    placeholder="Message"
                                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-0 bg-light-bg px-4 py-3 text-[15px] text-light-text outline-none placeholder:text-light-muted focus:ring-0 dark:bg-dark-input dark:text-dark-text dark:placeholder:text-dark-muted"
                                    value={newMessage}
                                    onChange={(event) => setNewMessage(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSendMessage(event);
                                        }
                                    }}
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm transition hover:bg-[#008069] disabled:bg-[#8696a0]"
                                    disabled={isSending || !newMessage.trim()}
                                    title="Send message"
                                >
                                    <PaperAirplaneIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </form>

                    <ContactInfoDrawer
                        isOpen={chatProfileOpen}
                        onClose={() => setChatProfileOpen(false)}
                        conversation={selectedConversation}
                        currentUser={currentUser}
                        isLandlordView={isLandlordView}
                        isOnline={activeMemberOnline}
                    />
                </>
            ) : (
                <EmptyState
                    icon={<UserCircleIcon className="h-12 w-12" />}
                    title="Select a conversation"
                    message="Choose an applicant or host from the inbox. Click the chat profile to open contact info."
                />
            )}
        </div>
    );

    return isDesktop ? (
        <PanelGroup direction="horizontal" className="h-full bg-light-bg dark:bg-dark-bg">
            <Panel defaultSize={34} minSize={27} maxSize={42}>{ConversationListPanel}</Panel>
            <PanelResizeHandle className="w-px bg-[#d1d7db] transition-colors hover:bg-[#00a884] dark:bg-[#26343d]" />
            <Panel defaultSize={66}>{ChatWindowPanel}</Panel>
        </PanelGroup>
    ) : (
        <div className="h-full bg-light-bg dark:bg-dark-bg">{conversationId ? ChatWindowPanel : ConversationListPanel}</div>
    );
};

export default InboxPage;
