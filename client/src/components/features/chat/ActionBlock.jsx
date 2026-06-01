import React, { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { FaUserFriends, FaCalendarCheck, FaUser, FaMobileAlt, FaVenusMars } from 'react-icons/fa';
import api from '../../../api';
import toast from 'react-hot-toast';
import BookingStatusTimeline from '../booking/BookingStatusTimeline';
import { formatListingTitle, formatPreferenceLabel } from '../../../utils/listingDisplay';

const calculateDuration = (start, end) => {
    if (!start || !end || new Date(end) <= new Date(start)) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();

    if (days < 0) {
        months--;
        days += new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
    return parts.join(', ');
};

const peopleLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

const statusStyles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    approved: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
    confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    cancelled: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-200',
};

const formatStatusText = (value = 'pending') => value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const InfoPill = ({ icon: Icon, label, value, wide = false }) => {
    if (!value) return null;

    return (
        <div className={`min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.045] ${wide ? 'col-span-2' : ''}`}>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-[#00a884]" />
                <span className="truncate">{label}</span>
            </div>
            <p className="mt-1 truncate text-[clamp(12px,3.15vw,14px)] font-black leading-tight text-slate-950 dark:text-[#e9edef]">
                {value}
            </p>
        </div>
    );
};

const MessageBubble = ({ children }) => (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-[clamp(12px,3.2vw,14px)] font-semibold leading-5 text-slate-800 shadow-inner shadow-white/50 dark:border-white/10 dark:bg-[#111b21]/90 dark:text-[#e9edef] dark:shadow-none">
        {children}
    </div>
);

const ActionBlock = ({ message, onUpdateRequest }) => {
    const { activeRole } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!message || !message.bookingRequest) return null;

    const {
        applicationId,
        status,
        roomTitle,
        checkInDate,
        checkOutDate,
        occupants,
        fullName,
        mobileNumber,
        message: userMessage,
    } = message.bookingRequest;

    const handleAction = async (action) => {
        setLoading(true);
        const toastId = toast.loading('Processing request...');

        try {
            await api.patch(`/applications/${applicationId}/${action}`);
            toast.success(`Request ${action}d successfully!`, { id: toastId });
            if (onUpdateRequest) onUpdateRequest();
        } catch (error) {
            const errorMessage = error.response?.data?.message || `Failed to ${action} request.`;
            toast.error(errorMessage, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const isLandlord = activeRole === 'landlord';
    let compositionString = '';

    if (occupants) {
        if (occupants.adults === 1 && occupants.gender) compositionString = formatPreferenceLabel(occupants.gender);
        else if (occupants.adults === 2 && occupants.occupantComposition) compositionString = occupants.occupantComposition;
        else if (occupants.adults > 2 && (occupants.males > 0 || occupants.females > 0)) {
            const maleString = peopleLabel(occupants.males, 'Man', 'Men');
            const femaleString = peopleLabel(occupants.females, 'Woman', 'Women');
            if (occupants.males > 0 && occupants.females > 0) compositionString = `${maleString}, ${femaleString}`;
            else if (occupants.males > 0) compositionString = maleString;
            else compositionString = femaleString;
        }
    }

    const statusKey = status?.toLowerCase() || 'pending';

    if (!checkInDate || !checkOutDate || !occupants) return null;

    const displayRoomTitle = formatListingTitle(roomTitle, 'Room request');
    const durationString = calculateDuration(checkInDate, checkOutDate);
    const stayRange = `${format(new Date(checkInDate), 'dd MMM')} - ${format(new Date(checkOutDate), 'dd MMM, yyyy')}`;
    const occupantSummary = [
        `${occupants.adults} Adult${occupants.adults > 1 ? 's' : ''}`,
        occupants.children > 0 ? `${occupants.children} Child${occupants.children > 1 ? 'ren' : ''}` : '',
    ].filter(Boolean).join(', ');

    return (
        <div className="mx-auto my-3 max-w-md px-1">
            <div className="overflow-hidden rounded-[1.45rem] border border-slate-200/90 bg-white/95 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#202c33]/95 dark:shadow-[0_20px_54px_-34px_rgba(0,0,0,0.9)]">
                <div className="p-3.5 min-[380px]:p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#00a884]">Booking request</p>
                            <h3 className="mt-1 truncate text-[clamp(14px,3.8vw,16px)] font-black leading-tight text-slate-950 dark:text-[#e9edef]">
                                {displayRoomTitle}
                            </h3>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-[#8696a0]">
                                Sent {format(new Date(message.createdAt), 'dd MMM, yyyy')}
                            </p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${statusStyles[statusKey] || statusStyles.pending}`}>
                            {formatStatusText(statusKey)}
                        </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <InfoPill icon={FaUser} label="Room seeker" value={fullName} />
                        <InfoPill icon={FaMobileAlt} label="Contact" value={mobileNumber} />
                        <InfoPill icon={FaCalendarCheck} label="Stay" value={`${stayRange}${durationString ? ` (${durationString})` : ''}`} wide />
                        <InfoPill icon={FaUserFriends} label="Occupants" value={occupantSummary} />
                        <InfoPill icon={FaVenusMars} label="Profile" value={compositionString} />
                    </div>

                    {userMessage && (
                        <div className="mt-3">
                            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-[#8696a0]">Stay note</p>
                            <MessageBubble>{userMessage}</MessageBubble>
                        </div>
                    )}

                    <BookingStatusTimeline status={statusKey} compact className="mt-3 hidden border-slate-200/80 bg-slate-50/90 p-3 shadow-none min-[390px]:block dark:border-white/10 dark:bg-[#111b21]/90" />
                </div>

                {isLandlord && statusKey === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-[#111b21]">
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={loading}
                            className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => handleAction('approve')}
                            disabled={loading}
                            className="rounded-full bg-[#00a884] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#008069] disabled:bg-cyan-300"
                        >
                            Accept
                        </button>
                    </div>
                )}

                {!isLandlord && statusKey === 'approved' && (
                    <div className="border-t border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-[#111b21]">
                        <Link
                            to={`/profile/payment/${applicationId}`}
                            className="flex w-full items-center justify-center rounded-full bg-[#00a884] px-4 py-3 text-sm font-black text-white transition hover:bg-[#008069]"
                        >
                            Confirm booking
                        </Link>
                    </div>
                )}

                {!isLandlord && statusKey === 'confirmed' && (
                    <div className="border-t border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-[#111b21]">
                        <Link
                            to={`/profile/agreement/${applicationId}`}
                            className="flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                            View agreement
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionBlock;
