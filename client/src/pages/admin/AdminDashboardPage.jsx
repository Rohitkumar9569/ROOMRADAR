import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import {
  Activity,
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileCheck,
  FileClock,
  FileText,
  Headphones,
  Home,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { confirmToast } from '../../utils/confirmToast';

const money = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const StatCard = ({ title, value, icon: Icon, tone = 'cyan', linkTo, caption }) => {
  const tones = {
    cyan: 'bg-cyan-500/10 text-cyan-500 shadow-cyan-500/10',
    blue: 'bg-blue-500/10 text-blue-500 shadow-blue-500/10',
    green: 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10',
    amber: 'bg-amber-500/10 text-amber-500 shadow-amber-500/10',
    red: 'bg-red-500/10 text-red-500 shadow-red-500/10',
    violet: 'bg-violet-500/10 text-violet-500 shadow-violet-500/10',
  };

  const content = (
    <div className="group h-full min-w-0 overflow-hidden rounded-[1.25rem] border border-light-border bg-light-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="max-w-[9.5rem] text-[9.5px] font-black uppercase leading-tight tracking-[0.08em] text-light-muted dark:text-dark-muted sm:text-[11px] sm:tracking-[0.14em]">{title}</p>
          <p className="mt-3 text-[clamp(24px,8vw,34px)] font-black leading-none tracking-tight text-light-text dark:text-dark-text sm:text-3xl">{value}</p>
          {caption && <p className="mt-1 max-w-[9rem] text-[10.5px] font-semibold leading-tight text-light-muted dark:text-dark-muted sm:mt-2 sm:text-xs">{caption}</p>}
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 shadow-lg sm:p-3 ${tones[tone] || tones.cyan}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      {linkTo && (
        <div className="mt-4 flex items-center gap-1 text-xs font-bold text-cyan-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-400">
          Open section <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
};

const SectionCard = ({ title, subtitle, children, action }) => (
  <section className="rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-5">
    <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        <h2 className="text-[clamp(16px,4.8vw,18px)] font-black leading-tight tracking-tight text-light-text dark:text-dark-text">{title}</h2>
        {subtitle && <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const RecentActivityFeed = ({ activities }) => {
  const icons = {
    NEW_USER: <UserPlus className="h-4 w-4 text-cyan-500" />,
    NEW_ROOM: <Home className="h-4 w-4 text-amber-500" />,
  };

  return (
    <div className="space-y-3">
      {activities.length > 0 ? activities.map((activity) => (
        <Link
          key={`${activity.type}-${activity._id}`}
          to={activity.link}
          className="flex items-start gap-3 rounded-2xl border border-light-border bg-light-bg p-3 transition-all hover:border-cyan-300 hover:bg-cyan-50/60 dark:border-dark-border dark:bg-dark-input dark:hover:border-cyan-700/60 dark:hover:bg-cyan-950/20"
        >
          <div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm dark:bg-dark-card">
            {icons[activity.type] || <Activity className="h-4 w-4 text-light-muted" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-light-text dark:text-dark-text">{activity.text}</p>
            <p className="mt-1 text-xs font-medium text-light-muted dark:text-dark-muted">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </Link>
      )) : (
        <div className="rounded-2xl border border-dashed border-light-border p-8 text-center text-sm font-semibold text-light-muted dark:border-dark-border dark:text-dark-muted">
          No platform activity yet.
        </div>
      )}
    </div>
  );
};

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [pendingRooms, setPendingRooms] = useState([]);
  const [signupData, setSignupData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [verification, setVerification] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectingRoomId, setRejectingRoomId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [
          statsRes,
          pendingRes,
          signupsRes,
          activitiesRes,
          analyticsRes,
          revenueRes,
          verificationRes,
          ticketsRes,
        ] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/pending-rooms'),
          api.get('/admin/stats/user-signups'),
          api.get('/admin/activities'),
          api.get('/admin/analytics'),
          api.get('/admin/revenue'),
          api.get('/admin/verifications'),
          api.get('/admin/tickets'),
        ]);

        setStats(statsRes.data);
        setPendingRooms(pendingRes.data || []);
        setSignupData(signupsRes.data || []);
        setActivities(activitiesRes.data || []);
        setAnalytics(analyticsRes.data);
        setRevenue(revenueRes.data);
        setVerification(verificationRes.data);
        setTickets(ticketsRes.data);
        setError(null);
      } catch (err) {
        setError('Could not load admin command center. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const supportOpenCount = useMemo(() => {
    return (tickets?.statusBreakdown || []).find((item) => item._id === 'open')?.count || 0;
  }, [tickets]);

  const handleApproveRoom = async (roomId) => {
    confirmToast({
      title: 'Approve this room?',
      description: 'The listing will become visible to room seekers.',
      confirmLabel: 'Approve',
      tone: 'success',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/rooms/${roomId}/approve`);
          toast.success('Room approved successfully.');
          setPendingRooms((currentRooms) => currentRooms.filter((room) => room._id !== roomId));
          setStats((currentStats) => ({
            ...currentStats,
            pendingRoomsCount: Math.max((currentStats?.pendingRoomsCount || 1) - 1, 0),
            publishedRoomsCount: (currentStats?.publishedRoomsCount || 0) + 1,
          }));
        } catch (err) {
          toast.error('Failed to approve room.');
        }
      },
    });
  };

  const handleRejectRoom = (roomId) => {
    setRejectingRoomId(roomId);
    setRejectReason('');
  };

  const submitRejectRoom = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Add a rejection reason.');
      return;
    }

    try {
      await api.patch(`/admin/rooms/${rejectingRoomId}/reject`, { reason });
      toast.success('Room rejected successfully.');
      setPendingRooms((currentRooms) => currentRooms.filter((room) => room._id !== rejectingRoomId));
      setStats((currentStats) => ({
        ...currentStats,
        pendingRoomsCount: Math.max((currentStats?.pendingRoomsCount || 1) - 1, 0),
      }));
      setRejectingRoomId('');
      setRejectReason('');
    } catch (err) {
      toast.error('Failed to reject room.');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-bg p-6 dark:bg-dark-bg">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg px-3 py-3 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem]">
          <div className="relative p-4 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-brand to-amber-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-500 sm:text-[11px] sm:tracking-[0.22em]">Platform command center</p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between sm:mt-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-[clamp(22px,6vw,30px)] font-black leading-tight tracking-tight">Admin Dashboard</h1>
                <p className="mt-2 max-w-2xl text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">
                  Monitor users, listings, revenue, trust signals, and support load from one premium control room.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold sm:flex sm:text-xs">
                <Link to="/admin/verifications" className="rounded-full bg-cyan-500/10 px-3 py-2 text-center text-cyan-600 dark:text-cyan-300 sm:px-4">Trust center</Link>
                <Link to="/admin/revenue" className="rounded-full bg-emerald-500/10 px-3 py-2 text-center text-emerald-600 dark:text-emerald-300 sm:px-4">Revenue</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} tone="cyan" linkTo="/admin/users" caption="All accounts" />
          <StatCard title="Landlords" value={stats?.totalLandlords ?? 0} icon={UserCheck} tone="blue" linkTo="/admin/users?role=Landlord" caption="Host accounts" />
          <StatCard title="Rooms" value={stats?.totalRooms ?? 0} icon={Home} tone="violet" linkTo="/admin/rooms" caption="All listings" />
          <StatCard title="Published" value={stats?.publishedRoomsCount ?? 0} icon={FileCheck} tone="green" linkTo="/admin/rooms?status=Published" caption="Live rooms" />
          <StatCard title="Pending" value={stats?.pendingRoomsCount ?? 0} icon={FileClock} tone="amber" linkTo="/admin/rooms?status=Pending" caption="Need review" />
          <StatCard title="Applications" value={stats?.totalApplications ?? 0} icon={FileText} tone="red" linkTo="/admin/analytics" caption="Booking flow" />
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
          <SectionCard
            title="Financial Health"
            subtitle="Real booking value and platform fee aggregation"
            action={<Link to="/admin/revenue" className="text-xs font-bold text-cyan-500">Open</Link>}
          >
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-light-bg p-3 dark:bg-dark-input sm:p-4">
                <CreditCard className="mb-3 h-5 w-5 text-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-light-muted dark:text-dark-muted sm:text-xs">Gross value</p>
                <p className="mt-1 truncate text-[15px] font-black sm:text-lg">{money(revenue?.summary?.grossBookingValue)}</p>
              </div>
              <div className="rounded-2xl bg-light-bg p-3 dark:bg-dark-input sm:p-4">
                <TrendingUp className="mb-3 h-5 w-5 text-cyan-500" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-light-muted dark:text-dark-muted sm:text-xs">Platform fee</p>
                <p className="mt-1 truncate text-[15px] font-black sm:text-lg">{money(revenue?.summary?.platformFees)}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Trust & Safety"
            subtitle="KYC and property verification queue"
            action={<Link to="/admin/verifications" className="text-xs font-bold text-cyan-500">Review</Link>}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-4 text-cyan-600 dark:text-cyan-300">
                <ShieldCheck className="mb-3 h-5 w-5" />
                <p className="text-xs font-bold uppercase tracking-wide">Verified users</p>
                <p className="mt-1 text-2xl font-black">{verification?.totals?.verified || 0}</p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-4 text-amber-600 dark:text-amber-300">
                <FileClock className="mb-3 h-5 w-5" />
                <p className="text-xs font-bold uppercase tracking-wide">Rooms pending</p>
                <p className="mt-1 text-2xl font-black">{verification?.pendingPropertyRooms?.length || 0}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Support Load"
            subtitle="Tickets and unresolved platform issues"
            action={<Link to="/admin/tickets" className="text-xs font-bold text-cyan-500">Open</Link>}
          >
            <div className="rounded-2xl bg-light-bg p-4 dark:bg-dark-input">
              <Headphones className="mb-3 h-5 w-5 text-violet-500" />
              <p className="text-xs font-bold uppercase tracking-wide text-light-muted dark:text-dark-muted">Open tickets</p>
              <p className="mt-1 text-3xl font-black">{supportOpenCount}</p>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">
                {tickets?.tickets?.length || 0} total tickets in support queue
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <SectionCard title="User Signups" subtitle="Monthly account growth from MongoDB">
              {signupData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={signupData} margin={{ top: 10, right: 18, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminSignupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" name="New Users" stroke="#06b6d4" strokeWidth={3} fill="url(#adminSignupGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-light-border text-sm font-semibold text-light-muted dark:border-dark-border dark:text-dark-muted">
                  No signup data available yet.
                </div>
              )}
            </SectionCard>
          </div>
          <div className="xl:col-span-2">
            <SectionCard title="Recent Activity" subtitle="Latest users and room submissions">
              <RecentActivityFeed activities={activities} />
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Rooms Awaiting Review"
          subtitle="Approve trustworthy listings quickly, reject with clear repair notes"
          action={<Link to="/admin/rooms?status=Pending" className="text-xs font-bold text-cyan-500">View queue</Link>}
        >
          {pendingRooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-light-border p-10 text-center dark:border-dark-border">
              <FileCheck className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-black">All caught up</h3>
              <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">There are no pending rooms to review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {pendingRooms.slice(0, 6).map((room) => (
                <div key={room._id} className="rounded-3xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-input">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black">{room.title}</p>
                      <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">{room.landlord?.name || 'Unknown landlord'}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-300">Pending</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button onClick={() => handleApproveRoom(room._id)} className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-600 transition hover:bg-emerald-500 hover:text-white">Approve</button>
                    <button onClick={() => handleRejectRoom(room._id)} className="rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-500 hover:text-white">Reject</button>
                    <Link to={`/admin/rooms/${room._id}/review`} className="rounded-2xl bg-cyan-500/10 px-3 py-2 text-center text-xs font-black text-cyan-600 transition hover:bg-cyan-500 hover:text-white">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <SectionCard title="Top Cities" subtitle="Real listing density by city">
            <div className="space-y-3">
              {(analytics?.topCities || []).length > 0 ? analytics.topCities.map((city) => (
                <div key={city._id} className="flex items-center justify-between rounded-2xl bg-light-bg p-3 dark:bg-dark-input">
                  <div>
                    <p className="font-bold">{city._id}</p>
                    <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{city.rooms} rooms - {money(city.averageRent)} avg rent</p>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-600 dark:text-cyan-300">{city.views || 0} views</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-light-border p-8 text-center text-sm font-semibold text-light-muted dark:border-dark-border dark:text-dark-muted">No city data yet.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Application Status" subtitle="Booking lifecycle distribution">
            <div className="grid grid-cols-2 gap-3">
              {(analytics?.applicationStatusBreakdown || []).length > 0 ? analytics.applicationStatusBreakdown.map((item) => (
                <div key={item._id || 'unknown'} className="rounded-2xl bg-light-bg p-4 dark:bg-dark-input">
                  <p className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{item._id || 'unknown'}</p>
                  <p className="mt-2 text-2xl font-black">{item.count}</p>
                </div>
              )) : (
                <div className="col-span-2 rounded-2xl border border-dashed border-light-border p-8 text-center text-sm font-semibold text-light-muted dark:border-dark-border dark:text-dark-muted">No application data yet.</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {rejectingRoomId && (
        <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-light-border bg-light-card p-5 shadow-2xl dark:border-dark-border dark:bg-dark-card">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Admin review</p>
            <h2 className="mt-2 text-xl font-black">Reject listing</h2>
            <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">This reason is shared with the landlord so they can fix the listing.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="input-field mt-4 resize-none"
              placeholder="Example: Photos are unclear, address is incomplete, or rent details need verification."
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRejectingRoomId('')} className="btn-outline">Cancel</button>
              <button type="button" onClick={submitRejectRoom} className="btn-primary">Reject room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
