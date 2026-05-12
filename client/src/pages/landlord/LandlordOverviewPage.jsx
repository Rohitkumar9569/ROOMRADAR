import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
    ArrowRight,
    BadgeCheck,
    BellRing,
    CheckCircle2,
    Eye,
    Home,
    IndianRupee,
    Plus,
    ShieldCheck,
    XCircle
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { formatListingTitle } from '../../utils/listingDisplay';

const COLORS = ['#e84040', '#0f766e', '#f59e0b', '#64748b', '#22c55e'];

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || fallbackRoomImage;

const LandlordOverviewPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionId, setActionId] = useState('');

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/landlords/stats');
            setStats(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load landlord dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const approveOrReject = async (applicationId, action) => {
        const toastId = toast.loading(action === 'approve' ? 'Approving request...' : 'Rejecting request...');
        try {
            setActionId(applicationId);
            await api.patch(`/applications/${applicationId}/${action}`);
            toast.success(action === 'approve' ? 'Request approved.' : 'Request rejected.', { id: toastId });
            await fetchDashboardData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed.', { id: toastId });
        } finally {
            setActionId('');
        }
    };

    const statCards = useMemo(() => ([
        { title: 'Total rooms', value: stats?.totalRooms || 0, Icon: Home, link: '/landlord/my-rooms', caption: 'Listings under your account' },
        { title: 'Pending requests', value: stats?.pendingRequests || 0, Icon: BellRing, link: '/landlord/inbox', caption: 'Waiting for approval' },
        { title: 'Confirmed bookings', value: stats?.confirmedBookings || 0, Icon: CheckCircle2, link: '/landlord/calendar', caption: 'Confirmed by both sides' },
        { title: 'This month views', value: stats?.thisMonthViews || 0, Icon: Eye, link: '/landlord/insights', caption: 'Total listing views' },
    ]), [stats]);

    if (loading) {
        return <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-light-bg dark:bg-dark-bg"><Spinner /></div>;
    }

    if (error) {
        return (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                <p>{error}</p>
                <button type="button" onClick={fetchDashboardData} className="btn-primary mt-5">
                    Retry
                </button>
            </div>
        );
    }

    const statusData = stats?.statusBreakdown || [];
    const pendingApplications = stats?.pendingApplications || [];

    return (
        <div className="min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.10),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-light-text dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#0d1117_0%,#111827_100%)] dark:text-dark-text">
            <MobileDashboardHero user={user} stats={stats} />

            <div className="mx-auto max-w-7xl space-y-4 px-4 pb-28 pt-2 md:space-y-7 md:px-0 md:py-0">
                <section className="hidden flex-col gap-4 rounded-3xl border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-5 md:flex lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Hosting command center</p>
                        <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Welcome back, {user?.name || 'Host'}</h1>
                        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-light-muted dark:text-dark-muted sm:text-sm">
                            Review requests, manage listings, and track every booking until host and applicant both confirm.
                        </p>
                    </div>
                    <Link to="/landlord/add-room" className="btn-primary inline-flex items-center justify-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add room
                    </Link>
                </section>

                <section className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
                    {statCards.map((card) => (
                        <StatCard key={card.title} {...card} />
                    ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Pending requests</p>
                                <h2 className="mt-1 text-xl font-semibold tracking-tight">Approve or reject quickly</h2>
                            </div>
                            <Link to="/landlord/calendar" className="text-sm font-semibold text-brand">Open calendar</Link>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-light-border dark:border-dark-border">
                            {pendingApplications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ShieldCheck className="mx-auto h-10 w-10 text-brand" />
                                    <h3 className="mt-3 text-lg font-semibold">No pending requests</h3>
                                    <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">New booking requests will appear here.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-light-border dark:divide-dark-border">
                                    {pendingApplications.map((application) => (
                                        <PendingRequestRow
                                            key={application._id}
                                            application={application}
                                            disabled={actionId === application._id}
                                            onApprove={() => approveOrReject(application._id, 'approve')}
                                            onReject={() => approveOrReject(application._id, 'reject')}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Listing health</p>
                                    <h2 className="mt-1 text-xl font-semibold tracking-tight">Room status</h2>
                                </div>
                                <BadgeCheck className="h-8 w-8 text-brand" />
                            </div>
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} innerRadius={48} paddingAngle={4}>
                                            {statusData.map((entry, index) => (
                                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-light-border p-8 text-center text-sm text-light-muted dark:border-dark-border dark:text-dark-muted">
                                    No listing status data yet.
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card">
                            <div className="flex items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                                    <IndianRupee className="h-6 w-6" />
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-light-muted dark:text-dark-muted">This month earnings</p>
                                    <p className="text-2xl font-semibold tracking-tight">{money(stats?.monthlyEarnings || 0)}</p>
                                </div>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-light-muted dark:text-dark-muted">
                                Calculated from confirmed applications in the current month.
                            </p>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    );
};

const MobileDashboardHero = ({ user, stats }) => (
    <section className="px-4 pb-4 pt-3 md:hidden">
        <div className="relative isolate mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 p-4 text-slate-950 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.42)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-50 dark:shadow-[0_24px_70px_-36px_rgba(0,0,0,0.72)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-cyan-300/24 via-white/32 to-rose-300/28 dark:from-cyan-400/14 dark:via-white/5 dark:to-brand/18" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-brand/12 blur-3xl dark:bg-brand/20" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-cyan-500/12 blur-3xl dark:bg-cyan-400/16" />

            <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/18 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700 backdrop-blur-xl dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Hosting today
                    </span>
                    <Link
                        to="/landlord/applications?status=pending"
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-black/[0.06] bg-white/70 px-3 text-xs font-black text-slate-950 shadow-sm backdrop-blur-xl transition active:scale-[0.96] dark:border-white/10 dark:bg-white/10 dark:text-white"
                        aria-label="Pending requests"
                    >
                        <BellRing className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                        {stats?.pendingRequests || 0}
                    </Link>
                </div>

                <div className="mt-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/38">Welcome back</p>
                    <h1 className="mt-1 max-w-full text-[clamp(24px,7vw,34px)] font-black leading-[0.98] tracking-[-0.045em]">
                        <span className="block truncate">{user?.name || 'Host'}</span>
                    </h1>
                    <p className="mt-3 max-w-[28ch] text-[13px] font-semibold leading-5 text-slate-600 dark:text-white/62">
                        Manage rooms, requests, and confirmations without leaving your host dashboard.
                    </p>
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <Link
                        to="/landlord/add-room"
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[1.25rem] bg-brand px-5 text-sm font-black text-white shadow-[0_18px_34px_-20px_rgba(232,64,64,0.95)] transition active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        Add room
                    </Link>
                    <Link
                        to="/landlord/my-rooms"
                        className="inline-flex min-h-[48px] items-center justify-center rounded-[1.25rem] border border-black/[0.06] bg-white/74 px-4 text-cyan-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98] dark:border-white/10 dark:bg-white/10 dark:text-cyan-200"
                        aria-label="Open listings"
                    >
                        <Home className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/68 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]">
                    <MiniHeroStat label="Rooms" value={stats?.totalRooms || 0} Icon={Home} />
                    <MiniHeroStat label="Views" value={stats?.thisMonthViews || 0} Icon={Eye} />
                    <MiniHeroStat label="Confirmed" value={stats?.confirmedBookings || 0} Icon={CheckCircle2} />
                </div>
            </div>
        </div>
    </section>
);

const MiniHeroStat = ({ label, value, Icon }) => (
    <div className="min-w-0 border-r border-black/[0.06] p-3 text-center last:border-r-0 dark:border-white/10">
        <Icon className="mx-auto h-4 w-4 text-cyan-600 dark:text-cyan-300" />
        <p className="mt-2 text-[clamp(18px,5.4vw,26px)] font-black leading-none text-cyan-700 dark:text-cyan-300">{value}</p>
        <p className="mt-1 truncate text-[9.5px] font-black text-slate-500 dark:text-white/54">{label}</p>
    </div>
);

const StatCard = ({ title, value, caption, Icon, link }) => (
    <Link to={link} className="group overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/78 p-3 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.62)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/70 sm:rounded-3xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.06em] text-light-muted dark:text-dark-muted sm:text-[13px] sm:normal-case sm:tracking-normal">{title}</p>
                <p className="mt-2 text-[22px] font-black tracking-tight text-slate-950 dark:text-white sm:text-[28px]">{value}</p>
            </div>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 transition group-hover:scale-105 dark:text-cyan-300 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[10.5px] font-semibold text-light-muted dark:text-dark-muted sm:mt-4 sm:text-[13px]">
            <span className="truncate sm:line-clamp-2 sm:whitespace-normal">{caption}</span>
            <ArrowRight className="h-4 w-4" />
        </div>
    </Link>
);

const PendingRequestRow = ({ application, onApprove, onReject, disabled }) => {
    const room = application.room || {};
    const student = application.student || {};
    const displayTitle = formatListingTitle(room.title, 'Room listing');

    return (
        <div className="grid gap-4 bg-light-card p-4 dark:bg-dark-card lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 gap-4">
                <img src={getRoomImage(room)} alt={displayTitle} className="h-20 w-24 rounded-2xl object-cover" />
                <div className="min-w-0">
                    <Link to={room._id ? `/room/${room._id}` : '/landlord/my-rooms'} className="block truncate text-base font-semibold hover:text-brand">
                        {displayTitle}
                    </Link>
                    <p className="mt-1 truncate text-sm text-light-muted dark:text-dark-muted">
                        Applicant: {student.name || application.fullName || 'Applicant'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">
                        {application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM yyyy') : 'Move-in pending'} · {money(room.rent)} / mo
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={onReject} disabled={disabled} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 lg:flex-none">
                    <XCircle className="h-4 w-4" />
                    Reject
                </button>
                <button type="button" onClick={onApprove} disabled={disabled} className="rr-approve-action inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60 lg:flex-none">
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                </button>
            </div>
        </div>
    );
};

export default LandlordOverviewPage;
