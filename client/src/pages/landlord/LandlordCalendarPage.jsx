// client/src/pages/LandlordCalendarPage.jsx (PROFESSIONAL REDESIGN)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/common/Spinner';
import api from '../../api';
import toast from 'react-hot-toast';
import RoomFilterDropdown from '../../components/features/search/RoomFilterDropdown';
import PremiumLandlordCalendar from '../../components/features/calendar/PremiumLandlordCalendar';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfLocalDay = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const getEventStart = (event) => toDate(event.checkInDate || event.start);
const getEventEnd = (event) => toDate(event.checkOutDate || event.end);

const buildGapAlerts = (events, rooms) => {
    const roomTitles = new Map((rooms || []).map((room) => [String(room._id), room.title || 'Room']));
    const today = startOfLocalDay(new Date());
    const groups = new Map();

    events
        .filter((event) => ['confirmed', 'approved'].includes(event.status))
        .forEach((event) => {
            const roomId = String(event.roomId || event.room?._id || '');
            const start = getEventStart(event);
            const end = getEventEnd(event);
            if (!roomId || !start || !end || end <= today) return;
            if (!groups.has(roomId)) groups.set(roomId, []);
            groups.get(roomId).push({ ...event, startDate: startOfLocalDay(start), endDate: startOfLocalDay(end) });
        });

    const alerts = [];
    groups.forEach((roomEvents, roomId) => {
        const sorted = roomEvents.sort((a, b) => a.startDate - b.startDate);
        for (let index = 0; index < sorted.length - 1; index += 1) {
            const current = sorted[index];
            const next = sorted[index + 1];
            const gapDays = Math.floor((next.startDate - current.endDate) / DAY_MS);
            if (gapDays >= 2 && current.endDate >= today) {
                alerts.push({
                    id: `${roomId}-${current.id || current._id}-${next.id || next._id}`,
                    roomId,
                    roomTitle: current.room?.title || roomTitles.get(roomId) || 'Room',
                    gapDays,
                    start: current.endDate,
                    end: next.startDate,
                });
            }
        }
    });

    return alerts
        .sort((a, b) => a.start - b.start)
        .slice(0, 3);
};

const LandlordCalendarPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, thisWeek: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRoomId, setSelectedRoomId] = useState('all');
    const [highlightThisWeek, setHighlightThisWeek] = useState(false);

    const refreshCalendar = async () => {
        const [calendarResponse, statsResponse] = await Promise.all([
            api.get('/landlords/calendar-data'),
            api.get('/applications/calendar-stats'),
        ]);

        setEvents(calendarResponse.data.bookings || []);
        setRooms(calendarResponse.data.rooms || []);
        setStats(statsResponse.data || { pending: 0, approved: 0, thisWeek: 0, rejected: 0 });
    };
    
    useEffect(() => {
        const fetchCalendarData = async () => {
            try {
                setLoading(true);
                await refreshCalendar();
            } catch (error) {
                toast.error("Could not load calendar data.");
            } finally {
                setLoading(false);
            }
        };
        fetchCalendarData();
    }, []);

    const filteredEvents = useMemo(() => {
        if (selectedRoomId === 'all') return events;
        return events.filter(event => String(event.roomId) === String(selectedRoomId));
    }, [events, selectedRoomId]);

    const gapAlerts = useMemo(() => buildGapAlerts(filteredEvents, rooms), [filteredEvents, rooms]);

    const handlePremiumEventClick = (event) => {
        if (event?.url) {
            navigate(event.url);
        }
    };

    const handleApprove = async (applicationId) => {
        try {
            await api.patch(`/applications/${applicationId}/approve`);
            toast.success('Booking approved successfully');
            await refreshCalendar();
        } catch (error) {
            toast.error('Failed to approve booking');
        }
    };

    const handleReject = async (applicationId) => {
        try {
            await api.patch(`/applications/${applicationId}/reject`);
            toast.success('Booking rejected successfully');
            await refreshCalendar();
        } catch (error) {
            toast.error('Failed to reject booking');
        }
    };

    const statCards = [
        { label: 'Pending', value: stats.pending || 0, Icon: Clock, className: 'text-amber-500 bg-amber-500/10', onClick: () => navigate('/landlord/applications?status=pending') },
        { label: 'Approved', value: stats.approved || 0, Icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/10', onClick: () => navigate('/landlord/applications?status=approved') },
        { label: 'This Week', value: stats.thisWeek || 0, Icon: CalendarDays, className: 'text-sky-500 bg-sky-500/10', onClick: () => setHighlightThisWeek((value) => !value) },
        { label: 'Rejected', value: stats.rejected || 0, Icon: XCircle, className: 'text-rose-500 bg-rose-500/10', onClick: () => navigate('/landlord/applications?status=rejected') },
    ];

    if (loading) return <div className="flex h-screen items-center justify-center bg-light-bg dark:bg-dark-bg"><Spinner /></div>;

    return (
        <div className="min-h-full bg-light-bg p-4 font-sans text-light-text dark:bg-dark-bg dark:text-dark-text sm:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-sidebar sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Hosting Control</p>
                        <h1 className="mt-1 text-2xl font-bold text-light-text dark:text-dark-text">Booking Calendar</h1>
                        <p className="text-sm text-light-muted dark:text-dark-muted">View requests, approvals, and move-in dates without leaving the calendar.</p>
                    </div>
                    <RoomFilterDropdown 
                        rooms={rooms}
                        selectedRoomId={selectedRoomId}
                        onSelectRoom={setSelectedRoomId}
                    />
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {statCards.map(({ label, value, Icon, className, onClick }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={onClick}
                            className={`rounded-2xl border border-light-border bg-light-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-border dark:bg-dark-sidebar ${highlightThisWeek && label === 'This Week' ? 'ring-2 ring-sky-500' : ''}`}
                        >
                            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${className}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-2xl font-black text-light-text dark:text-dark-text">{value}</p>
                            <p className="text-sm font-semibold text-light-muted dark:text-dark-muted">{label}</p>
                        </button>
                    ))}
                </div>

                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <AlertTriangle className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">Revenue gap detector</p>
                                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                                    {gapAlerts.length ? `${gapAlerts.length} short vacancy gap${gapAlerts.length === 1 ? '' : 's'} found` : 'No short vacancy gaps detected'}
                                </h2>
                                <p className="mt-1 text-sm font-semibold leading-6 text-amber-800/80 dark:text-amber-100/80">
                                    Use small discounts or short-stay offers to convert empty days between bookings.
                                </p>
                            </div>
                        </div>
                        {gapAlerts.length > 0 && (
                            <div className="grid gap-2 lg:min-w-[32rem] lg:grid-cols-3">
                                {gapAlerts.map((gap) => (
                                    <button
                                        key={gap.id}
                                        type="button"
                                        onClick={() => setSelectedRoomId(gap.roomId)}
                                        className="rounded-2xl border border-amber-200 bg-white/78 p-3 text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-amber-400/20 dark:bg-slate-950/35"
                                    >
                                        <div className="flex items-center gap-2 font-black text-amber-700 dark:text-amber-200">
                                            <TrendingUp className="h-4 w-4" />
                                            {gap.gapDays} day gap
                                        </div>
                                        <p className="mt-1 truncate font-semibold text-slate-700 dark:text-slate-200">{gap.roomTitle}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {gap.start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {gap.end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-sidebar sm:p-4">
                    <PremiumLandlordCalendar 
                        bookings={filteredEvents}
                        highlightThisWeek={highlightThisWeek}
                        onEventClick={handlePremiumEventClick}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                </div>
            </div>
        </div>
    );
};

export default LandlordCalendarPage;
