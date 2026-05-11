// client/src/pages/LandlordCalendarPage.jsx (PROFESSIONAL REDESIGN)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/common/Spinner';
import api from '../../api';
import toast from 'react-hot-toast';
import RoomFilterDropdown from '../../components/features/search/RoomFilterDropdown';
import PremiumLandlordCalendar from '../../components/features/calendar/PremiumLandlordCalendar';
import { CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react';

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
        return events.filter(event => event.roomId === selectedRoomId);
    }, [events, selectedRoomId]);

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
