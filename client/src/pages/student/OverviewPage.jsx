import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Heart,
    Home,
    Inbox,
    Search,
    ShieldCheck,
    Timer,
    UserRound,
    XCircle
} from 'lucide-react';
import api, { getStudentApplications, getStudentDashboardSummary } from '../../api';
import Spinner from '../../components/common/Spinner';
import BookingStatusTimeline from '../../components/features/booking/BookingStatusTimeline';
import { useAuth } from '../../context/AuthContext';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { formatListingTitle } from '../../utils/listingDisplay';

const statusMeta = {
    pending: { label: 'Pending', Icon: Timer, badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20' },
    approved: { label: 'Approved', Icon: ShieldCheck, badge: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20' },
    confirmed: { label: 'Confirmed', Icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' },
    rejected: { label: 'Rejected', Icon: XCircle, badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20' },
    cancelled: { label: 'Cancelled', Icon: XCircle, badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-dark-input dark:text-dark-muted dark:ring-dark-border' }
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || fallbackRoomImage;

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const calculateProfileCompletion = (user) => {
    const fields = [
        user?.name,
        user?.email,
        user?.mobileNumber || user?.phone,
        user?.profilePicture || user?.avatarUrl,
        user?.gender,
        user?.city,
        user?.bio
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
};

function OverviewPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [applications, setApplications] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const [summaryResponse, applicationResponse, wishlistResponse] = await Promise.all([
                    getStudentDashboardSummary(),
                    getStudentApplications(),
                    api.get('/users/wishlist')
                ]);

                if (!active) return;
                setSummary(summaryResponse.data || {});
                setApplications(Array.isArray(applicationResponse.data) ? applicationResponse.data : []);
                setWishlist(wishlistResponse.data?.wishlist || []);
                setError('');
            } catch (err) {
                if (active) setError(err.response?.data?.message || 'Could not load your travelling dashboard.');
            } finally {
                if (active) setLoading(false);
            }
        };

        if (user) fetchDashboard();
        return () => {
            active = false;
        };
    }, [user]);

    const recentApplications = useMemo(() => applications.slice(0, 4), [applications]);
    const profileCompletion = calculateProfileCompletion(user);

    if (loading) {
        return (
            <div className="flex h-80 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 md:m-8">
                {error}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-light-bg p-4 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text md:p-8">
            <div className="mx-auto max-w-7xl">
                <section className="overflow-hidden rounded-3xl border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card">
                    <div className="grid gap-6 p-5 md:grid-cols-[1fr_340px] md:p-8">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Travelling dashboard</p>
                            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                                {getGreeting()}, {user?.name || 'Travelling'}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-light-muted dark:text-dark-muted">
                                Track requests, approvals, wishlist rooms, and your next move-in from one clean workspace.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link to="/rooms" className="btn-primary inline-flex items-center gap-2">
                                    <Search className="h-4 w-4" />
                                    Find rooms
                                </Link>
                                <Link to="/profile/my-applications" className="btn-outline inline-flex items-center gap-2">
                                    My applications
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-light-bg p-5 dark:bg-dark-input">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">Profile completion</p>
                                    <p className="mt-1 text-xs text-light-muted dark:text-dark-muted">Better profiles get faster host replies.</p>
                                </div>
                                <UserRound className="h-9 w-9 text-brand" />
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                                <span className="text-4xl font-semibold">{profileCompletion}%</span>
                                <Link to="/profile/about-me" className="text-sm font-semibold text-brand">Edit profile</Link>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-light-border dark:bg-dark-border">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${profileCompletion}%` }} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard icon={Heart} label="Wishlist" value={summary?.wishlistCount || wishlist.length} link="/profile/wishlist" />
                    <StatCard icon={Timer} label="Pending" value={summary?.pendingCount || 0} link="/profile/my-applications" />
                    <StatCard icon={ShieldCheck} label="Approved" value={summary?.approvedCount || 0} link="/profile/my-applications" />
                    <StatCard icon={CheckCircle2} label="Confirmed" value={summary?.confirmedCount || 0} link="/profile/my-applications" />
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
                    <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card md:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">My bookings</h2>
                                <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">Live status from your real room requests.</p>
                            </div>
                            <Link to="/profile/my-applications" className="text-sm font-semibold text-brand">View all</Link>
                        </div>

                        <div className="mt-5 space-y-4">
                            {recentApplications.length === 0 ? (
                                <EmptyState icon={Home} title="No applications yet" text="Rooms you request will appear here with their approval timeline." link="/rooms" linkText="Browse rooms" />
                            ) : (
                                recentApplications.map((application) => (
                                    <ApplicationRow key={application._id} application={application} />
                                ))
                            )}
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card md:p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold">Wishlist</h2>
                                    <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">Saved rooms from your real wishlist.</p>
                                </div>
                                <Link to="/profile/wishlist" className="text-sm font-semibold text-brand">Open</Link>
                            </div>
                            <div className="mt-5 space-y-3">
                                {wishlist.slice(0, 3).length === 0 ? (
                                    <EmptyState icon={Heart} title="Wishlist is empty" text="Save rooms to compare them here." link="/rooms" linkText="Search rooms" />
                                ) : (
                                    wishlist.slice(0, 3).map((room) => (
                                        <Link key={room._id} to={`/room/${room._id}`} className="flex gap-3 rounded-2xl border border-light-border p-3 transition hover:border-brand dark:border-dark-border">
                                            <img src={getRoomImage(room)} alt={formatListingTitle(room.title)} className="h-20 w-24 rounded-xl object-cover" />
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-semibold">{formatListingTitle(room.title)}</h3>
                                                <p className="mt-1 truncate text-xs text-light-muted dark:text-dark-muted">{room.location?.city || room.location?.fullAddress || 'Location pending'}</p>
                                                <p className="mt-2 text-sm font-bold text-brand">{money(room.rent)} / mo</p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card md:p-6">
                            <h2 className="text-xl font-semibold">Quick actions</h2>
                            <div className="mt-5 grid gap-3">
                                <QuickAction icon={Search} label="Search rooms" to="/rooms" />
                                <QuickAction icon={Heart} label="Wishlist" to="/profile/wishlist" />
                                <QuickAction icon={Inbox} label="Inbox" to="/profile/inbox" />
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    );
}

const StatCard = ({ icon: Icon, label, value, link }) => (
    <Link to={link} className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
            </div>
            <ArrowRight className="h-4 w-4 text-light-muted dark:text-dark-muted" />
        </div>
        <p className="mt-5 text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{label}</p>
    </Link>
);

const ApplicationRow = ({ application }) => {
    const status = (application.status || 'pending').toLowerCase();
    const meta = statusMeta[status] || statusMeta.pending;
    const Icon = meta.Icon;
    const room = application.room || {};
    const stay = application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM yyyy') : 'Move-in pending';

    return (
        <div className="rounded-2xl border border-light-border p-4 dark:border-dark-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <img src={getRoomImage(room)} alt={formatListingTitle(room.title, 'Room')} className="h-28 w-full rounded-2xl object-cover lg:w-36" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${meta.badge}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-light-muted dark:text-dark-muted">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {stay}
                        </span>
                    </div>
                    <Link to={room._id ? `/room/${room._id}` : '/rooms'} className="mt-2 block truncate text-lg font-semibold hover:text-brand">
                        {formatListingTitle(room.title, 'Room listing')}
                    </Link>
                    <p className="mt-1 truncate text-sm text-light-muted dark:text-dark-muted">{room.location?.fullAddress || room.location?.city || 'Location pending'}</p>
                </div>
                <Link to="/profile/my-applications" className="btn-outline inline-flex items-center justify-center gap-2">
                    Track
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <BookingStatusTimeline status={status} compact className="mt-4 border-light-border bg-light-bg shadow-none dark:border-dark-border dark:bg-dark-input" />
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, text, link, linkText }) => (
    <div className="rounded-2xl border border-dashed border-light-border p-6 text-center dark:border-dark-border">
        <Icon className="mx-auto h-9 w-9 text-brand" />
        <h3 className="mt-3 text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{text}</p>
        <Link to={link} className="mt-4 inline-flex text-sm font-semibold text-brand">
            {linkText}
        </Link>
    </div>
);

const QuickAction = ({ icon: Icon, label, to }) => (
    <Link to={to} className="flex min-h-[52px] items-center justify-between rounded-2xl border border-light-border px-4 transition hover:border-brand hover:text-brand dark:border-dark-border">
        <span className="inline-flex items-center gap-3 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {label}
        </span>
        <ArrowRight className="h-4 w-4" />
    </Link>
);

export default OverviewPage;
