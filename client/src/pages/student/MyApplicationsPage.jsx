import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
    CheckCircle2,
    CalendarClock,
    Edit3,
    FileText,
    Home,
    MapPin,
    MessageCircle,
    Search,
    ShieldCheck,
    Star,
    Timer,
    XCircle,
} from 'lucide-react';
import { cancelApplication, getStudentApplications, requestStayChange } from '../../api';
import BookingRequestModal from '../../components/features/booking/BookingRequestModal';
import ReviewModal from '../../components/features/rooms/ReviewModal';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { confirmToast } from '../../utils/confirmToast';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
import { formatListingTitle } from '../../utils/listingDisplay';

const APPLICATIONS_CACHE_KEY = 'student:applications';

const statusMeta = {
    pending: {
        label: 'Pending',
        Icon: Timer,
        badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
        headline: 'Host is reviewing',
    },
    approved: {
        label: 'Approved',
        Icon: ShieldCheck,
        badge: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20',
        headline: 'Ready to confirm',
    },
    confirmed: {
        label: 'Confirmed',
        Icon: CheckCircle2,
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
        headline: 'Room booked',
    },
    rejected: {
        label: 'Rejected',
        Icon: XCircle,
        badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20',
        headline: 'Request closed',
    },
    cancelled: {
        label: 'Cancelled',
        Icon: XCircle,
        badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-secondary-700 dark:text-secondary-200 dark:ring-secondary-600',
        headline: 'Request cancelled',
    },
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatPrice = (value) => money(value).replace(/^[^\d-]+/, '\u20b9');

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || fallbackRoomImage;

const SkeletonLoader = () => (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rr-smooth-card h-72 animate-pulse rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-secondary-700 dark:bg-secondary-800">
                <div className="h-32 rounded-2xl bg-slate-200 dark:bg-secondary-700" />
                <div className="mt-4 h-5 w-2/3 rounded bg-slate-200 dark:bg-secondary-700" />
                <div className="mt-3 h-4 w-1/2 rounded bg-slate-200 dark:bg-secondary-700" />
                <div className="mt-8 h-11 rounded-2xl bg-slate-200 dark:bg-secondary-700" />
            </div>
        ))}
    </div>
);

const StayChangeModal = ({ application, onClose, onSuccess }) => {
    const currentCheckOut = application?.checkOutDate ? format(new Date(application.checkOutDate), 'yyyy-MM-dd') : '';
    const [requestedCheckOutDate, setRequestedCheckOutDate] = useState(currentCheckOut);
    const [message, setMessage] = useState('Please review this stay date change request.');
    const [submitting, setSubmitting] = useState(false);
    const roomTitle = formatListingTitle(application?.room?.title, 'this room');
    const currentDate = application?.checkOutDate ? format(new Date(application.checkOutDate), 'dd MMM yyyy') : 'Not set';
    const selectedDate = requestedCheckOutDate ? new Date(`${requestedCheckOutDate}T00:00:00`) : null;
    const currentDateObj = application?.checkOutDate ? new Date(application.checkOutDate) : null;
    const minCheckOutDate = application?.checkInDate ? format(new Date(application.checkInDate), 'yyyy-MM-dd') : '';
    const minCheckOutDateObj = minCheckOutDate ? new Date(`${minCheckOutDate}T00:00:00`) : null;
    const changeType = selectedDate && currentDateObj && selectedDate > currentDateObj ? 'Extension request' : 'Move-out request';

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!requestedCheckOutDate || requestedCheckOutDate === currentCheckOut) {
            toast.error('Choose a new move-out date.');
            return;
        }
        if (selectedDate && minCheckOutDateObj && selectedDate <= minCheckOutDateObj) {
            toast.error('Move-out date must be after move-in date.');
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await requestStayChange(application._id, {
                requestedCheckOutDate,
                message,
            });
            toast.success(data?.message || 'Stay change request sent.');
            onSuccess?.(data.application);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not send request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:items-center sm:p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-slate-950">
                <div className="bg-slate-950 p-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{changeType}</p>
                            <h2 className="mt-1 text-xl font-black">Manage stay dates</h2>
                            <p className="mt-1 text-xs font-semibold leading-5 text-white/78">{roomTitle}</p>
                        </div>
                        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/14 text-white">×</button>
                    </div>
                </div>
                <div className="space-y-4 p-5">
                    {application.stayChangeRequest?.status === 'pending' && (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                            A stay change request is already pending with the landlord.
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                            <p className="text-[10px] font-black uppercase text-slate-500">Current move-out</p>
                            <p className="mt-1 text-sm font-black">{currentDate}</p>
                        </div>
                        <label className="block rounded-2xl bg-cyan-50 p-3 dark:bg-cyan-500/10">
                            <span className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-200">New move-out</span>
                            <input
                                type="date"
                                min={minCheckOutDate}
                                value={requestedCheckOutDate}
                                onChange={(event) => setRequestedCheckOutDate(event.target.value)}
                                className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-2 py-2 text-sm font-black outline-none dark:border-cyan-400/20 dark:bg-slate-950"
                            />
                        </label>
                    </div>
                    <label className="block">
                        <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Message to landlord</span>
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={4}
                            maxLength={700}
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900"
                        />
                    </label>
                    <p className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        Landlord approval is required. If approved, your agreement and room availability calendar update automatically. Rent/refund difference should be confirmed in chat or support.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-slate-200 text-sm font-black dark:border-slate-700">Cancel</button>
                        <button type="submit" disabled={submitting || application.stayChangeRequest?.status === 'pending'} className="min-h-12 rounded-2xl bg-brand text-sm font-black text-white disabled:opacity-60">
                            {submitting ? 'Sending...' : 'Send request'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const EmptyState = ({ hasSearch, activeFilter }) => (
    <div className="rr-smooth-card rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-secondary-700 dark:bg-secondary-800">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300">
            <FileText className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">No matching room requests</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-secondary-300">
            {hasSearch ? 'Try a different room or landlord name.' : `No ${activeFilter || 'current'} room requests yet. Rooms you request will appear here.`}
        </p>
        <Link
            to="/rooms"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 dark:bg-white dark:text-slate-950"
        >
            <Home className="h-4 w-4" />
            Explore rooms
        </Link>
    </div>
);

const StudentApplicationCard = ({ application, onCancel, onEdit, onReview, onStayChange }) => {
    const navigate = useNavigate();
    const status = (application.status || 'pending').toLowerCase();
    const meta = statusMeta[status] || statusMeta.pending;
    const StatusIcon = meta.Icon;
    const room = application.room || {};
    const canCancel = ['pending', 'approved'].includes(status);
    const canEdit = status === 'pending';
    const canReview = status === 'confirmed' && !application.hasReview && !application.review;
    const conversationPath = application.conversation ? `/profile/inbox/${application.conversation}` : '/profile/inbox';
    const city = room.location?.city || 'Location';
    const displayTitle = formatListingTitle(room.title, 'Room listing');
    const appliedDate = application.checkInDate || application.createdAt;
    const cardTarget = room._id ? `/room/${room._id}` : '/rooms';
    const stop = (event) => event.stopPropagation();

    return (
        <article
            onClick={() => navigate(cardTarget)}
            className="rr-application-card rr-smooth-card group cursor-pointer overflow-hidden rounded-2xl border border-light-border bg-white shadow-sm transition-colors hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
        >
            <div className="rr-application-card-media relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-dark-input">
                <img
                    src={getRoomImage(room)}
                    alt={displayTitle}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm backdrop-blur ${
                    status === 'pending'
                        ? 'bg-amber-500/90'
                        : status === 'approved'
                            ? 'bg-cyan-500/90'
                            : status === 'confirmed'
                                ? 'bg-emerald-500/90'
                                : 'bg-rose-500/90'
                }`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {meta.label}
                </span>
                <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-cyan-500 shadow-sm backdrop-blur dark:bg-black/50">
                    <FileText className="h-3.5 w-3.5" />
                </span>
            </div>

            <div className="rr-application-card-body p-3">
                <p className="rr-application-title rr-line-clamp-2 min-w-0 text-[13px] font-semibold leading-tight text-light-text dark:text-dark-text">{displayTitle}</p>
                <p className="mt-1 flex min-h-[1rem] items-center gap-1 truncate text-[11px] font-semibold text-light-muted dark:text-dark-muted">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-cyan-500" />
                    {city}
                </p>
                <p className="mt-2 min-h-[1.25rem] text-[14px] font-bold text-light-text dark:text-dark-text">
                    {formatPrice(room.rent)}
                    <span className="text-[10px] font-normal text-light-muted dark:text-dark-muted"> /mo</span>
                </p>
                <p className="mt-1 min-h-[0.875rem] truncate text-[10px] font-semibold text-light-muted dark:text-dark-muted">
                    {appliedDate ? format(new Date(appliedDate), 'dd MMM yyyy') : 'Recently'} · {application.landlord?.name || 'Host'}
                </p>

                <div className="mt-2 grid min-h-8 grid-cols-[0.82fr_1.18fr] gap-1" onClick={stop}>
                    <Link to={conversationPath} className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-light-border bg-light-card px-1.5 text-[10px] font-black text-light-muted transition hover:border-cyan-400 hover:text-cyan-600 dark:border-dark-border dark:bg-dark-input dark:text-dark-muted sm:px-2 sm:text-[11px]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="whitespace-nowrap">Chat</span>
                    </Link>
                    {status === 'approved' ? (
                        <button type="button" onClick={() => navigate(`/profile/payment/${application._id}`)} className="min-h-8 min-w-0 rounded-xl bg-cyan-500 px-1.5 text-[10px] font-black text-white transition hover:bg-cyan-600 sm:px-2 sm:text-[11px]">
                            Confirm
                        </button>
                    ) : canReview ? (
                        <button type="button" onClick={() => onReview(application)} className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1 rounded-xl bg-amber-500 px-1 text-[10px] font-black text-white transition hover:bg-amber-600 sm:px-2 sm:text-[11px]">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Review
                        </button>
                    ) : status === 'confirmed' ? (
                        <span className="inline-flex min-h-8 min-w-0 items-center justify-center rounded-xl bg-emerald-500/10 px-1.5 text-center text-[10px] font-black text-emerald-700 dark:text-emerald-300 sm:px-2 sm:text-[11px]">
                            Room booked
                        </span>
                    ) : canEdit ? (
                        <button type="button" onClick={() => onEdit(application)} className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1 rounded-xl bg-cyan-500/10 px-1.5 text-[10px] font-black text-cyan-700 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-300 sm:px-2 sm:text-[11px]">
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="whitespace-nowrap">Edit</span>
                        </button>
                    ) : (
                        <span className="inline-flex min-h-8 min-w-0 items-center justify-center rounded-xl bg-light-bg px-1.5 text-center text-[10px] font-black text-light-muted dark:bg-dark-input dark:text-dark-muted sm:px-2 sm:text-[11px]">
                            {meta.headline}
                        </span>
                    )}
                </div>

                {status === 'confirmed' && application.review && (
                    <div className="mt-1.5 inline-flex min-h-7 w-full items-center justify-center gap-1 rounded-xl bg-amber-500/10 px-2 text-[10px] font-black text-amber-700 dark:text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Stay reviewed
                    </div>
                )}

                {status === 'confirmed' && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5" onClick={stop}>
                        <button type="button" onClick={() => navigate(`/profile/agreement/${application._id}`)} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-1 text-[10px] font-black text-white transition hover:bg-emerald-700 sm:px-2 sm:text-[11px]">
                            <FileText className="h-3.5 w-3.5" />
                            Agreement
                        </button>
                        <button type="button" onClick={() => onStayChange(application)} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl bg-cyan-500/10 px-1 text-[10px] font-black text-cyan-700 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-300 sm:px-2 sm:text-[11px]">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Manage
                        </button>
                    </div>
                )}

                {status === 'confirmed' && application.stayChangeRequest?.status === 'pending' && (
                    <p className="mt-1.5 rounded-xl bg-amber-500/10 px-2 py-1 text-center text-[10px] font-black text-amber-700 dark:text-amber-300">
                        Date change pending
                    </p>
                )}

                {canCancel && (
                    <button type="button" onClick={(event) => { stop(event); onCancel(application._id); }} className="mt-1.5 inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                    </button>
                )}
            </div>
        </article>
    );
};

const MyApplicationsPage = () => {
    const cachedApplications = readTabCache(APPLICATIONS_CACHE_KEY)?.value;
    const [applications, setApplications] = useState(() => cachedApplications?.applications || []);
    const [loading, setLoading] = useState(() => !cachedApplications);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [reviewApplication, setReviewApplication] = useState(null);
    const [stayChangeApplication, setStayChangeApplication] = useState(null);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const {
        applicationSearchTerm: searchTerm,
        setApplicationSearchTerm,
        activeFilter,
        setApplicationCounts,
    } = useOutletContext();

    const fetchApps = useCallback(async ({ forceLoading = false } = {}) => {
        const cached = readTabCache(APPLICATIONS_CACHE_KEY)?.value;
        if (cached && !forceLoading) {
            setApplications(cached.applications || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const { data } = await getStudentApplications();
            const nextApplications = Array.isArray(data) ? data : [];
            setTabCache(APPLICATIONS_CACHE_KEY, { applications: nextApplications });
            setApplications(nextApplications);
        } catch (error) {
            if (!cached) toast.error('Failed to fetch your room requests.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApps();
    }, [fetchApps]);

    useEffect(() => {
        if (!setApplicationCounts) return;

        const counts = { all: applications.length, pending: 0, approved: 0, confirmed: 0, rejected: 0, cancelled: 0 };
        applications.forEach((app) => {
            if (counts[app.status] !== undefined) counts[app.status] += 1;
        });
        setApplicationCounts(counts);
    }, [applications, setApplicationCounts]);

    const filteredApplications = useMemo(() => {
        return applications
            .filter((app) => !activeFilter || activeFilter === 'all' || app.status === activeFilter)
            .filter((app) => {
                const term = (searchTerm || '').toLowerCase();
                if (!term) return true;
                return (
                    app.room?.title?.toLowerCase().includes(term) ||
                    app.landlord?.name?.toLowerCase().includes(term)
                );
            });
    }, [applications, activeFilter, searchTerm]);

    const handleCancel = async (applicationId) => {
        confirmToast({
            title: 'Cancel this booking request?',
            description: 'The host will no longer be able to approve this request.',
            confirmLabel: 'Cancel request',
            onConfirm: async () => {
                const toastId = toast.loading('Cancelling request...');
                try {
                    await cancelApplication(applicationId);
                    setApplications((prev) => {
                        const nextApplications = prev.map((app) => (app._id === applicationId ? { ...app, status: 'cancelled' } : app));
                        setTabCache(APPLICATIONS_CACHE_KEY, { applications: nextApplications });
                        return nextApplications;
                    });
                    toast.success('Request cancelled.', { id: toastId });
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Failed to cancel request.', { id: toastId });
                }
            },
        });
    };

    const handleEditApplication = (application) => {
        setSelectedApplication(application);
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        setSelectedApplication(null);
        fetchApps({ forceLoading: true });
    };

    const handleReviewSuccess = () => {
        setApplications((prev) => {
            const nextApplications = prev.map((app) => (
                app._id === reviewApplication?._id
                    ? { ...app, hasReview: true, review: { rating: true } }
                    : app
            ));
            setTabCache(APPLICATIONS_CACHE_KEY, { applications: nextApplications });
            return nextApplications;
        });
        setReviewApplication(null);
        fetchApps({ forceLoading: true });
    };

    const handleStayChangeSuccess = (updatedApplication) => {
        setApplications((prev) => {
            const nextApplications = prev.map((app) => (
                app._id === updatedApplication?._id
                    ? {
                        ...app,
                        ...updatedApplication,
                        hasReview: app.hasReview,
                        review: app.review,
                        guestReview: app.guestReview,
                    }
                    : app
            ));
            setTabCache(APPLICATIONS_CACHE_KEY, { applications: nextApplications });
            return nextApplications;
        });
        setStayChangeApplication(null);
        fetchApps({ forceLoading: true });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 dark:bg-secondary-900 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">My room requests</p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[28px]">Booking requests</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-secondary-300">
                            Track each room from first inquiry to host approval, your confirmation, and final agreement.
                        </p>
                    </div>

                    {setApplicationSearchTerm && (
                        <div className="w-full max-w-md">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm || ''}
                                    onChange={(event) => setApplicationSearchTerm(event.target.value)}
                                    placeholder="Search room or landlord"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <SkeletonLoader />
                ) : filteredApplications.length === 0 ? (
                    <EmptyState hasSearch={Boolean(searchTerm)} activeFilter={activeFilter} />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredApplications.map((application) => (
                            <StudentApplicationCard
                                key={application._id}
                                application={application}
                                onCancel={handleCancel}
                                onEdit={handleEditApplication}
                                onReview={setReviewApplication}
                                onStayChange={setStayChangeApplication}
                            />
                        ))}
                    </div>
                )}
            </div>

            {isEditModalOpen && selectedApplication?.room && (
                <BookingRequestModal
                    mode="edit"
                    applicationData={selectedApplication}
                    room={selectedApplication.room}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleEditSuccess}
                />
            )}

            <ReviewModal
                isOpen={Boolean(reviewApplication)}
                booking={reviewApplication}
                onClose={() => setReviewApplication(null)}
                onSuccess={handleReviewSuccess}
            />
            <StayChangeModal
                application={stayChangeApplication}
                onClose={() => setStayChangeApplication(null)}
                onSuccess={handleStayChangeSuccess}
            />
        </div>
    );
};

export default MyApplicationsPage;
