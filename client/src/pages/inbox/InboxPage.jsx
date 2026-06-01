import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
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
    UserCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ActionBlock from '../../components/features/chat/ActionBlock';
import api from '../../api';
import toast from 'react-hot-toast';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';
import { connectSocketAfterMount, socketOptions } from '../../config/socketOptions';
import { useUI } from '../../context/UIContext';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
import { readScroll, saveScroll } from '../../utils/scrollStore';
import { formatListingTitle } from '../../utils/listingDisplay';
import { triggerHaptic } from '../../utils/haptics';
import { getAvatarColorStyle, getAvatarInitial } from '../../utils/avatar';

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
    admin_update: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-400/25',
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
            avatarUrl: null,
            profilePicture: null,
            isRoomRadarAdmin: true,
        };
    }
    return otherMember;
};

const getConversationRoomTitle = (convo) => {
    if (isAdminConversation(convo)) return convo.room?.title ? `Review update - ${formatListingTitle(convo.room.title)}` : 'Room review update';
    return formatListingTitle(convo.room?.title, 'General Inquiry');
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
        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-black capitalize leading-none ring-1 ${STATUS_STYLES[statusKey] || STATUS_STYLES.booking}`}>
            {label}
        </span>
    );
};

const getSystemMessageTone = (message) => {
    const text = String(message?.text || '');

    if (message?.messageType === 'admin_update') {
        return {
            className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100',
            label: 'Admin update',
        };
    }

    if (
        message?.messageType !== 'system_update' &&
        !/\b(booking request|stay change|approved|declined|rejected|cancelled|confirmed|agreement|move-out|extension)\b/i.test(text)
    ) {
        return null;
    }

    if (/\b(declined|rejected|unfortunately|not approved)\b/i.test(text)) {
        return {
            className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100',
            label: 'Request declined',
        };
    }

    if (/\b(approved|confirm your booking|lock the room)\b/i.test(text)) {
        return {
            className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100',
            label: 'Request approved',
        };
    }

    if (/\b(cancelled|expired)\b/i.test(text)) {
        return {
            className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200',
            label: 'Booking update',
        };
    }

    if (/\b(confirmed|agreement|guidebook|checked in|checked out)\b/i.test(text)) {
        return {
            className: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100',
            label: 'Stay update',
        };
    }

    return {
        className: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100',
        label: 'System update',
    };
};

const areChatMetaEqual = (left, right) => {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return (
        left.name === right.name &&
        left.avatarUrl === right.avatarUrl &&
        left.subtitle === right.subtitle &&
        left.isOnline === right.isOnline &&
        left.isAdmin === right.isAdmin &&
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

const avatarSizeClass = {
    list: 'h-14 w-14 sm:h-[58px] sm:w-[58px]',
    header: 'h-12 w-12',
    drawer: 'h-32 w-32',
};

const ConversationAvatar = ({ name = 'RoomRadar', email = '', avatarUrl, isAdmin = false, size = 'list', status = 'offline', className = '' }) => (
    <span className={`rr-chat-avatar rr-chat-avatar--${size} ${isAdmin ? 'is-admin' : ''} ${avatarSizeClass[size] || avatarSizeClass.list} ${className}`}>
        {isAdmin ? (
            <>
                <span className="rr-admin-avatar-mark" aria-hidden="true">
                    <span>R</span><span>R</span>
                </span>
                <span className="rr-admin-avatar-badge" aria-hidden="true">
                    <CheckBadgeIcon className="h-full w-full" />
                </span>
            </>
        ) : avatarUrl ? (
            <img src={avatarUrl} alt="" />
        ) : (
            <span className="rr-avatar-initial" style={getAvatarColorStyle(email || name, name)} aria-hidden="true">
                {getAvatarInitial(name, email)}
            </span>
        )}
        {!isAdmin && status && <span className={`rr-chat-avatar-status is-${status}`} aria-hidden="true" />}
    </span>
);

const ConversationCard = ({ convo, onClick, isSelected, currentUser, isOnline }) => {
    const displayMember = getConversationDisplayMember(convo, currentUser);
    if (!displayMember) return null;

    const lastMessageDate = convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : null;
    const isAdmin = isAdminConversation(convo);
    const roomTitle = getConversationRoomTitle(convo);
    const status = getConversationStatus(convo);
    const unreadCount = Number(convo.unreadCount || 0);
    const avatarUrl = displayMember.avatarUrl || displayMember.profilePicture;
    const avatarStatus = isOnline ? 'online' : convo.application?.status === 'pending' ? 'pending' : 'offline';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`rr-inbox-conversation-card group min-h-[96px] w-full border-b border-[#e9edef] px-4 py-3 text-left transition dark:border-[#26343d] sm:min-h-[100px] sm:px-5 ${isSelected ? 'is-selected' : ''} ${
                isSelected
                    ? 'bg-[#e9edef] dark:bg-[#2a3942]'
                    : 'bg-transparent hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
            }`}
        >
            <div className="flex gap-3.5">
                <ConversationAvatar name={displayMember.name} email={displayMember.email} avatarUrl={avatarUrl} isAdmin={isAdmin} status={avatarStatus} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[16.5px] font-black leading-tight text-[#111b21] dark:text-[#e9edef] sm:text-[17px]">{displayMember.name}</p>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                            {lastMessageDate && (
                                <span className="text-[13px] font-bold leading-none text-[#667781] dark:text-[#8696a0]">
                                    {formatDistanceToNow(lastMessageDate, { addSuffix: true })}
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span className="rr-message-count-badge rr-inbox-unread-badge" aria-label={`${unreadCount} unread messages`}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="mt-1 truncate text-[14.5px] font-extrabold leading-tight text-cyan-700 dark:text-[#00a884] sm:text-[15px]">{roomTitle}</p>
                    <p className="mt-1 line-clamp-1 text-[14px] font-semibold leading-5 text-[#667781] dark:text-[#8696a0] sm:text-[14.5px]">{getConversationPreview(convo)}</p>

                    <div className="mt-2.5 flex max-w-full items-center gap-2 overflow-hidden">
                        {getStatusBadge(status)}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-[13px] font-black capitalize leading-none text-[#667781] dark:bg-[#202c33] dark:text-[#aebac1]">
                            {convo.conversationType === 'booking' ? <CalendarDaysIcon className="h-4 w-4" /> : <ChatBubbleLeftRightIcon className="h-4 w-4" />}
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
    const systemTone = getSystemMessageTone(message);

    if (systemTone) {
        return (
            <div className="flex justify-center px-2">
                <div className={`max-w-[min(34rem,92%)] rounded-2xl border px-4 py-2.5 text-center shadow-sm backdrop-blur-sm ${systemTone.className}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-75">{systemTone.label}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-bold leading-5 [overflow-wrap:anywhere] sm:text-sm">
                        {message.text}
                    </p>
                    {sentAt && <span className="mt-1 block text-[10px] font-black opacity-60">{sentAt}</span>}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[75%] flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div
                    className={`relative rounded-2xl border px-3.5 py-2 shadow-sm after:absolute after:top-0 after:h-3 after:w-3 ${
                        isOwnMessage
                            ? 'rounded-tr-sm border-emerald-200 bg-[#d9fdd3] text-[#111b21] after:-right-1 after:bg-[#d9fdd3] dark:border-emerald-400/15 dark:bg-[#005c4b] dark:text-[#e9edef] dark:after:bg-[#005c4b]'
                            : 'rounded-tl-sm border-slate-200 bg-white text-[#111b21] after:-left-1 after:bg-white dark:border-white/10 dark:bg-[#202c33] dark:text-[#e9edef] dark:after:bg-[#202c33]'
                    }`}
                >
                    <p
                        className="whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]"
                        style={{ overflowWrap: 'anywhere' }}
                    >
                        {message.text}
                    </p>
                    {sentAt && (
                        <span className={`ml-3 mt-1 block text-right text-[10px] font-bold ${isOwnMessage ? 'text-emerald-900/55 dark:text-[#d9fdd3]/70' : 'text-light-muted dark:text-[#8696a0]'}`}>
                            {sentAt}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon, title, message, action = null }) => (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-[#667781] dark:text-[#8696a0]">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#e9edef] text-[#00a884] dark:bg-[#202c33]">
            {icon}
        </div>
        <h2 className="text-xl font-extrabold text-[#111b21] dark:text-[#e9edef]">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6">{message}</p>
        {action && <div className="mt-5">{action}</div>}
    </div>
);

const ConversationListSkeleton = () => (
    <div className="py-1" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex min-h-[96px] gap-3.5 border-b border-[#e9edef] px-4 py-3 dark:border-[#26343d] sm:min-h-[100px] sm:px-5">
                <div className="skeleton-wave h-14 w-14 flex-shrink-0 rounded-full bg-[#e9edef] dark:bg-[#202c33]" />
                <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className="skeleton-wave h-4 w-32 rounded-full bg-[#e9edef] dark:bg-[#202c33]" />
                        <div className="skeleton-wave h-3 w-12 rounded-full bg-[#e9edef] dark:bg-[#202c33]" />
                    </div>
                    <div className="skeleton-wave mt-3 h-3.5 w-44 max-w-full rounded-full bg-[#e9edef] dark:bg-[#202c33]" />
                    <div className="skeleton-wave mt-2 h-3.5 w-64 max-w-full rounded-full bg-[#f0f2f5] dark:bg-[#1f2c34]" />
                    <div className="mt-3 flex gap-2">
                        <div className="skeleton-wave h-7 w-20 rounded-full bg-[#f0f2f5] dark:bg-[#202c33]" />
                        <div className="skeleton-wave h-7 w-24 rounded-full bg-[#f0f2f5] dark:bg-[#202c33]" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const MessageThreadSkeleton = () => (
    <div className="mx-auto max-w-4xl space-y-3 py-2" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => {
            const own = index % 3 !== 0;
            return (
                <div key={index} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                    <div className={`skeleton-wave h-11 rounded-2xl ${own ? 'w-[68%] max-w-[22rem] bg-[#d9fdd3] dark:bg-[#005c4b]' : 'w-[58%] max-w-[20rem] bg-white dark:bg-[#202c33]'}`} />
                </div>
            );
        })}
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
    const avatarUrl = displayMember.avatarUrl || displayMember.profilePicture;

    return (
        <div className={`absolute inset-0 z-40 flex justify-end transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <button
                type="button"
                aria-label="Close contact info"
                onClick={onClose}
                className={`hidden flex-1 bg-black/30 transition-opacity md:block ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            />
            <aside
                className={`h-full max-h-full w-full max-w-full overflow-hidden bg-[#f0f2f5] shadow-2xl transition-transform duration-300 dark:bg-[#111b21] md:w-[390px] ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="flex h-16 flex-shrink-0 items-center gap-3 bg-[#202c33] px-4 text-white">
                        <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10" title="Close">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                        <h3 className="text-base font-bold">Contact info</h3>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <section className="bg-white px-6 py-8 text-center dark:bg-[#111b21]">
                            <ConversationAvatar
                                name={displayMember.name}
                                email={displayMember.email}
                                avatarUrl={avatarUrl}
                                isAdmin={isAdmin}
                                size="drawer"
                                status={isOnline ? 'online' : 'offline'}
                                className="mx-auto"
                            />
                            <h2 className="mt-4 truncate text-2xl font-extrabold text-[#111b21] dark:text-[#e9edef]">{displayMember.name}</h2>
                            <p className="mt-1 text-sm font-semibold text-[#667781] dark:text-[#8696a0]">{isAdmin ? 'RoomRadar review desk' : isLandlordView ? 'Room seeker conversation' : 'Host conversation'}</p>
                            <p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                                isAdmin
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-100'
                                    : isOnline
                                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                                    : 'bg-[#f0f2f5] text-[#667781] dark:bg-[#202c33] dark:text-[#aebac1]'
                            }`}>
                                <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-blue-400' : isOnline ? 'bg-[#00a884]' : 'bg-[#8696a0]'}`} />
                                {isAdmin ? 'Admin updates' : isOnline ? 'Active now' : 'Recently active'}
                            </p>
                            <div className="mt-4 flex justify-center">{getStatusBadge(getConversationStatus(conversation))}</div>
                        </section>

                        <section className="mt-3 bg-white p-4 dark:bg-[#111b21]">
                            <div className="space-y-3">
                                <DetailRow icon={HomeModernIcon} label="Room" value={formatListingTitle(room?.title, 'General inquiry')} />
                                <DetailRow icon={DocumentTextIcon} label="Request" value={getConversationRequestLabel(conversation)} />
                                <DetailRow icon={CalendarDaysIcon} label="Stay Dates" value={applicationDates} />
                                <DetailRow icon={ClockIcon} label="Last Updated" value={conversation.lastMessage?.createdAt ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true }) : null} />
                            </div>
                        </section>

                        <section className="mt-3 bg-white p-4 dark:bg-[#111b21]">
                            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-[#00a884]/25 dark:bg-[#005c4b]/35">
                                <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-800 dark:text-cyan-100">
                                    <CheckBadgeIcon className="h-5 w-5" />
                                    Follow-up
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
    const { refreshUnreadConversationCount } = useSocket() || {};
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
    const [conversationError, setConversationError] = useState('');
    const [messagesError, setMessagesError] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const messagesEndRef = useRef(null);
    const messagesScrollRef = useRef(null);
    const conversationListRef = useRef(null);
    const socket = useRef();
    const conversationIdRef = useRef(conversationId);
    const currentUserIdRef = useRef(currentUser?._id);
    const shouldInstantScrollMessagesRef = useRef(true);
    const selectedConversation = useMemo(() => allConversations.find((c) => c._id === conversationId), [allConversations, conversationId]);

    const updateConversationInList = useCallback((targetConversationId, updater) => {
        if (!targetConversationId) return;

        setAllConversations((prev) => {
            let changed = false;
            const nextConversations = prev.map((convo) => {
                if (convo._id !== targetConversationId) return convo;
                changed = true;
                return updater(convo);
            });

            if (changed) {
                setTabCache(conversationsCacheKey, { conversations: nextConversations });
            }

            return changed ? nextConversations : prev;
        });
    }, [conversationsCacheKey]);

    useEffect(() => {
        conversationIdRef.current = conversationId;
        currentUserIdRef.current = currentUser?._id;
    }, [conversationId, currentUser?._id]);

    useEffect(() => {
        setChatProfileOpen(false);
        shouldInstantScrollMessagesRef.current = true;
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
                isAdmin,
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
            setConversationError('');
            setLoading(false);
        } else if (!silent) {
            setConversationError('');
            setLoading(true);
        }

        try {
            const { data } = await api.get(endpoint);
            setTabCache(conversationsCacheKey, { conversations: data });
            setAllConversations(data);
            setConversationError('');
        } catch (error) {
            if (!silent && !cached) {
                setConversationError('Messages could not load. Check your connection and retry.');
                toast.error('Failed to fetch conversations.');
            } else if (!silent) {
                setConversationError('Showing saved chats. Refresh to get the latest messages.');
            }
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
            setMessagesError('');
            setLoadingMessages(false);
        } else {
            setMessagesError('');
            setLoadingMessages(true);
        }

        try {
            const { data } = await api.get(`/chat/messages/${id}`);
            setTabCache(messagesCacheKey, { messages: data });
            setMessages(data);
            setMessagesError('');
            try {
                await api.patch(`/chat/conversations/${id}/read`);
                updateConversationInList(id, (convo) => ({ ...convo, unreadCount: 0 }));
                refreshUnreadConversationCount?.();
            } catch (readError) {
                refreshUnreadConversationCount?.();
            }
            fetchConversations({ silent: true });
        } catch (error) {
            if (!cached) {
                setMessagesError('This chat could not load. Please retry.');
                toast.error('Failed to fetch messages.');
            } else {
                setMessagesError('Showing saved messages. Refresh to get the latest chat.');
            }
        } finally {
            setLoadingMessages(false);
        }
    }, [fetchConversations, refreshUnreadConversationCount, roleKey, updateConversationInList]);

    useEffect(() => {
        if (!currentUser?._id) return undefined;

        const nextSocket = io(SOCKET_URL, socketOptions);
        socket.current = nextSocket;
        const cleanupSocket = connectSocketAfterMount(nextSocket);

        nextSocket.on('getMessage', (data = {}) => {
            const targetConversationId = data.conversationId?.toString();
            const activeConversationId = conversationIdRef.current?.toString();
            const senderId = data.senderId?.toString();
            const currentUserId = currentUserIdRef.current?.toString();
            const isIncoming = senderId && senderId !== currentUserId;
            const isActiveConversation = targetConversationId && targetConversationId === activeConversationId;

            if (!isIncoming || !targetConversationId) return;

            const createdAt = data.createdAt || new Date().toISOString();
            updateConversationInList(targetConversationId, (convo) => ({
                ...convo,
                lastMessage: {
                    text: data.text,
                    createdAt,
                    messageType: data.messageType || 'text',
                },
                unreadCount: isActiveConversation ? 0 : Number(convo.unreadCount || 0) + 1,
            }));

            if (isActiveConversation) {
                setMessages((prev) => {
                    if (data._id && prev.some((message) => message._id === data._id)) return prev;
                    const nextMessages = [
                        ...prev,
                        {
                            _id: data._id || `socket-${senderId}-${Date.now()}`,
                            ...data,
                            sender: { _id: data.senderId },
                            createdAt,
                        },
                    ];
                    setTabCache(`inbox:${roleKey}:messages:${targetConversationId}`, { messages: nextMessages });
                    return nextMessages;
                });

                api.patch(`/chat/conversations/${targetConversationId}/read`)
                    .then(() => refreshUnreadConversationCount?.())
                    .catch(() => refreshUnreadConversationCount?.());
                return;
            }

            refreshUnreadConversationCount?.();
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
    }, [currentUser?._id, refreshUnreadConversationCount, roleKey, updateConversationInList]);

    useEffect(() => {
        if (currentUser && socket.current) {
            socket.current.emit('setup', currentUser._id);
            socket.current.emit('addUser', currentUser._id);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        fetchMessages(conversationId);
    }, [conversationId, fetchMessages]);

    const scrollMessagesToBottom = useCallback((behavior = 'auto') => {
        const node = messagesScrollRef.current;
        if (!node) return;

        const top = Math.max(node.scrollHeight - node.clientHeight, 0);
        if (behavior === 'smooth') {
            node.scrollTo({ top, behavior: 'smooth' });
            return;
        }

        node.scrollTop = top;
    }, []);

    useLayoutEffect(() => {
        if (!conversationId || (loadingMessages && shouldInstantScrollMessagesRef.current)) return undefined;

        const behavior = shouldInstantScrollMessagesRef.current ? 'auto' : 'smooth';
        scrollMessagesToBottom(behavior);

        let frameId = null;
        if (typeof window !== 'undefined') {
            frameId = window.requestAnimationFrame(() => scrollMessagesToBottom(behavior));
        }

        if (shouldInstantScrollMessagesRef.current && !loadingMessages) {
            shouldInstantScrollMessagesRef.current = false;
        }

        return () => {
            if (frameId && typeof window !== 'undefined') window.cancelAnimationFrame(frameId);
        };
    }, [conversationId, loadingMessages, messages.length, scrollMessagesToBottom]);

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
            triggerHaptic('success');
            fetchConversations({ silent: true });
        } catch (error) {
            triggerHaptic('error');
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
        <div className="rr-inbox-list-panel flex h-full flex-col overflow-hidden border-r border-[#e9edef] bg-[#f7f6f3] dark:border-[#26343d] dark:bg-[#111b21]">
            <div className="rr-inbox-list-toolbar flex-shrink-0 border-b border-[#e9edef]/80 bg-white/90 px-3 pb-2 pt-2 shadow-sm backdrop-blur-xl dark:border-[#26343d] dark:bg-[#111b21]/95 sm:px-4 sm:pb-3 md:pt-3">
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
                            className={`rr-filter-chip inline-flex flex-shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-black transition sm:px-4 ${
                                activeFilter === filter
                                    ? 'bg-[#00a884] text-white shadow-sm'
                                    : 'bg-white text-[#54656f] ring-1 ring-[#e9edef] hover:text-[#111b21] dark:bg-[#1f2c34] dark:text-[#aebac1] dark:ring-[#2a3942]'
                            }`}
                        >
                            {filter}
                            <span className={`rr-filter-chip-count rounded-full px-2 py-0.5 text-[12px] font-black ${activeFilter === filter ? 'bg-white/20 text-white' : 'bg-[#f0f2f5] dark:bg-[#202c33]'}`}>
                                {filterCounts[filter] || 0}
                            </span>
                        </button>
                    ))}
                </ScrollStrip>
            </div>

            <div ref={conversationListRef} onScroll={handleConversationListScroll} className="rr-inbox-list-scroll flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
                {loading ? (
                    <ConversationListSkeleton />
                ) : conversationError && !allConversations.length ? (
                    <EmptyState
                        icon={<XMarkIcon className="h-11 w-11" />}
                        title="Messages did not load"
                        message={conversationError}
                        action={(
                            <button type="button" onClick={() => fetchConversations()} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00a884] px-5 text-sm font-black text-white">
                                Retry
                            </button>
                        )}
                    />
                ) : filteredConversations.length > 0 ? (
                    <>
                        {conversationError && (
                            <div className="mx-3 my-2 flex items-center justify-between gap-3 rounded-2xl border border-[#e9edef] bg-white px-3 py-2 text-xs font-black text-[#54656f] shadow-sm dark:border-[#26343d] dark:bg-[#111b21] dark:text-[#aebac1]">
                                <span className="min-w-0 flex-1">{conversationError}</span>
                                <button type="button" onClick={() => fetchConversations()} className="flex-shrink-0 rounded-full bg-[#00a884] px-3 py-1.5 text-[11px] text-white">
                                    Refresh
                                </button>
                            </div>
                        )}
                        {filteredConversations.map((convo) => (
                            <ConversationCard
                                key={convo._id}
                                convo={convo}
                                onClick={() => handleConversationClick(convo._id)}
                                isSelected={selectedConversation?._id === convo._id}
                                currentUser={currentUser}
                                isOnline={!isAdminConversation(convo) && onlineUserIds.includes(getOtherMember(convo, currentUser)?._id?.toString())}
                            />
                        ))}
                    </>
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
        <div className="rr-inbox-chat-panel relative flex h-full flex-1 flex-col overflow-hidden bg-light-bg dark:bg-[#0b1014]">
            {selectedConversation ? (
                <>
                    <div className="rr-inbox-chat-header hidden h-16 flex-shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-3 dark:border-[#26343d] dark:bg-[#202c33] sm:px-4 md:flex">
                        <button
                            type="button"
                            onClick={() => setChatProfileOpen(true)}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Open contact info"
                        >
                            <ConversationAvatar
                                name={activeOtherMember?.name}
                                email={activeOtherMember?.email}
                                avatarUrl={activeOtherMember?.avatarUrl || activeOtherMember?.profilePicture}
                                isAdmin={activeConversationIsAdmin}
                                size="header"
                                status={activeMemberOnline ? 'online' : 'offline'}
                            />
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-black leading-tight text-[#111b21] dark:text-[#e9edef]">{activeOtherMember?.name}</h2>
                                <p className="truncate text-sm font-bold text-[#667781] dark:text-[#8696a0]">
                                    {activeConversationIsAdmin ? getConversationRoomTitle(selectedConversation) : `${activeMemberOnline ? 'Active now' : 'Recently active'} - ${formatListingTitle(selectedConversation.room?.title, 'General Inquiry')}`}
                                </p>
                            </div>
                        </button>

                        <div className="flex items-center gap-1">
                            <span className="hidden items-center gap-1 rounded-full bg-[#d9fdd3] px-3 py-1.5 text-sm font-extrabold text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3] sm:inline-flex">
                                <CheckBadgeIcon className="h-4 w-4" />
                                {activeConversationIsAdmin ? 'Official' : 'Verified'}
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

                    <div ref={messagesScrollRef} className="rr-inbox-message-scroll min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
                        <div className="rr-message-thread-inner mx-auto max-w-4xl space-y-3">
                            {loadingMessages ? (
                                <MessageThreadSkeleton />
                            ) : messagesError && !messages.length ? (
                                <EmptyState
                                    icon={<XMarkIcon className="h-12 w-12" />}
                                    title="Chat did not load"
                                    message={messagesError}
                                    action={(
                                        <button type="button" onClick={() => fetchMessages(conversationId)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00a884] px-5 text-sm font-black text-white">
                                            Retry
                                        </button>
                                    )}
                                />
                            ) : messages.length ? (
                                <>
                                    {messagesError && (
                                        <div className="mx-auto mb-3 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[#e9edef] bg-white px-3 py-2 text-xs font-black text-[#54656f] shadow-sm dark:border-[#26343d] dark:bg-[#111b21] dark:text-[#aebac1]">
                                            <span className="min-w-0 flex-1">{messagesError}</span>
                                            <button type="button" onClick={() => fetchMessages(conversationId)} className="flex-shrink-0 rounded-full bg-[#00a884] px-3 py-1.5 text-[11px] text-white">
                                                Refresh
                                            </button>
                                        </div>
                                    )}
                                    {messages.map((message) => {
                                        if (message.messageType === 'booking_request') {
                                            return <ActionBlock key={message._id} message={message} onUpdateRequest={() => { fetchMessages(conversationId); fetchConversations(); }} />;
                                        }

                                        const isOwnMessage = message.sender?._id === currentUser?._id;
                                        return <MessageBubble key={message._id} message={message} isOwnMessage={isOwnMessage} />;
                                    })}
                                </>
                            ) : (
                                <EmptyState
                                    icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
                                    title="No messages yet"
                                    message="Start the conversation when you are ready. Room details and booking updates will stay here."
                                />
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <form onSubmit={handleSendMessage} className="rr-inbox-composer flex-shrink-0 border-t border-light-border bg-light-card p-3 dark:border-dark-border dark:bg-[#1f2c34]">
                        <div className="mx-auto max-w-4xl">
                            <ScrollStrip className="mb-2 pb-1">
                                {quickReplies.map((reply) => (
                                    <button
                                        key={reply}
                                        type="button"
                                        onClick={() => setNewMessage(reply)}
                                        className="flex-shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-extrabold text-[#54656f] ring-1 ring-[#e9edef] transition hover:text-[#008069] dark:bg-[#111b21] dark:text-[#aebac1] dark:ring-[#2a3942] dark:hover:text-[#00a884]"
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
                    message="Choose a room seeker or host from the inbox. Click the chat profile to open contact info."
                />
            )}
        </div>
    );

    return isDesktop ? (
        <PanelGroup direction="horizontal" className="rr-inbox-shell h-full bg-light-bg dark:bg-dark-bg">
            <Panel defaultSize={34} minSize={27} maxSize={42}>{ConversationListPanel}</Panel>
            <PanelResizeHandle className="rr-inbox-resize-handle w-px bg-[#d1d7db] transition-colors hover:bg-[#00a884] dark:bg-[#26343d]" />
            <Panel defaultSize={66}>{ChatWindowPanel}</Panel>
        </PanelGroup>
    ) : (
        <div className="rr-inbox-shell h-full bg-light-bg dark:bg-dark-bg">{conversationId ? ChatWindowPanel : ConversationListPanel}</div>
    );
};

export default InboxPage;
