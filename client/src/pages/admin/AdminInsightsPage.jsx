import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileClock,
  Filter,
  Headphones,
  Home,
  Inbox,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatListingTitle } from '../../utils/listingDisplay';
import { notifyAdminCountsChanged } from '../../utils/adminEvents';
import { triggerHaptic } from '../../utils/haptics';

const money = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dateLabel = (value) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusTone = (status = '') => {
  const lower = String(status).toLowerCase();
  if (['published', 'verified', 'completed', 'resolved', 'approved', 'active'].includes(lower)) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
  if (['pending', 'pending_review', 'open', 'in_progress'].includes(lower)) return 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
  if (['rejected', 'failed', 'banned', 'urgent'].includes(lower)) return 'bg-red-500/10 text-red-600 dark:text-red-300';
  return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300';
};

const PageShell = ({ eyebrow, title, subtitle, children }) => (
  <div className="min-h-screen bg-light-bg px-3 py-3 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-5 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div className="rounded-[1.5rem] border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem] sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-500 sm:text-[11px] sm:tracking-[0.22em]">{eyebrow}</p>
        <h1 className="mt-2 text-[clamp(23px,7vw,30px)] font-black leading-tight tracking-[-0.02em] sm:mt-3">{title}</h1>
        <p className="mt-2 max-w-3xl text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

const MetricCard = ({ label, value, icon: Icon, tone = 'cyan', detail, to }) => {
  const tones = {
    cyan: 'text-cyan-500 bg-cyan-500/10',
    green: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
  };

  const content = (
    <div className={`min-w-0 overflow-hidden rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm transition dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-4 ${to ? 'hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:hover:border-cyan-700/60' : ''}`}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="max-w-[12rem] text-[9.5px] font-black uppercase leading-tight tracking-[0.08em] text-light-muted dark:text-dark-muted sm:text-[11px] sm:tracking-[0.14em]">{label}</p>
          <p className="mt-2 break-words text-[clamp(22px,7vw,30px)] font-black leading-none tracking-tight sm:mt-3">{value}</p>
          {detail && <p className="mt-1 text-[10px] font-semibold leading-tight text-light-muted dark:text-dark-muted sm:mt-2 sm:text-xs">{detail}</p>}
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 sm:p-3 ${tones[tone] || tones.cyan}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const Card = ({ title, subtitle, children }) => (
  <section className="rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-5">
    <div className="mb-3 sm:mb-4">
      <h2 className="text-[clamp(16px,4.8vw,18px)] font-black leading-tight tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-3xl border border-dashed border-light-border p-10 text-center dark:border-dark-border">
    <p className="font-black">{title}</p>
    <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">{description}</p>
  </div>
);

const useAdminResource = (section) => {
  const endpointMap = {
    analytics: '/admin/analytics',
    verifications: '/admin/verifications',
    revenue: '/admin/revenue',
    tickets: '/admin/tickets',
    logs: '/admin/logs',
    settings: '/admin/settings',
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true);
        const { data: response } = await api.get(endpointMap[section]);
        setData(response);
        setError('');
      } catch (err) {
        setError('Could not load this admin section.');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [section]);

  return { data, setData, loading, error };
};

const AnalyticsPanel = ({ data }) => {
  const roomChart = (data?.roomStatusBreakdown || []).map((item) => ({ name: item._id || 'Unknown', count: item.count }));
  const roleChart = (data?.userRoleBreakdown || []).map((item) => ({ name: item._id || 'Unknown', count: item.count }));
  const applicationChart = (data?.applicationStatusBreakdown || []).map((item) => ({ name: item._id || 'Unknown', count: item.count }));

  return (
    <PageShell eyebrow="Analytics & Reports" title="Platform Intelligence" subtitle="Real-time growth, listing health, booking lifecycle, and city demand insights from MongoDB.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        <MetricCard label="Gross booking value" value={money(data?.revenue?.grossBookingValue)} icon={CreditCard} tone="green" />
        <MetricCard label="Platform fees" value={money(data?.revenue?.platformFees)} icon={TrendingUp} tone="cyan" />
        <MetricCard label="Paid volume" value={money(data?.revenue?.paidPayments)} icon={CheckCircle2} tone="violet" />
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Card title="Room Status" subtitle="Listing moderation and publishing distribution">
          {roomChart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roomChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No room analytics yet" description="Room status data appears after listings are created." />}
        </Card>

        <Card title="Application Status" subtitle="Booking requests across the lifecycle">
          {applicationChart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={applicationChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No application data yet" description="Booking lifecycle data appears after users send requests." />}
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Card title="Weekly Applications" subtitle="Recent booking demand trend">
            {(data?.weeklyApplications || []).length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.weeklyApplications}>
                  <defs>
                    <linearGradient id="weeklyApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <Tooltip />
                  <Area dataKey="count" stroke="#06b6d4" strokeWidth={3} fill="url(#weeklyApps)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No recent demand yet" description="Recent applications will appear here automatically." />}
          </Card>
        </div>
        <div className="xl:col-span-2">
          <Card title="User Roles" subtitle="Access distribution by account role">
            <div className="space-y-3">
              {roleChart.length ? roleChart.map((role) => (
                <div key={role.name} className="flex items-center justify-between rounded-2xl bg-light-bg p-3 dark:bg-dark-input">
                  <span className="font-bold">{role.name}</span>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-600 dark:text-cyan-300">{role.count}</span>
                </div>
              )) : <EmptyState title="No role data" description="User role analytics will appear here." />}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Top Cities" subtitle="Listing density, views, and average rent">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.topCities || []).length ? data.topCities.map((city) => (
            <div key={city._id} className="min-w-0 rounded-2xl bg-light-bg p-3 dark:bg-dark-input sm:rounded-3xl sm:p-4">
              <p className="truncate text-sm font-black sm:text-base">{city._id}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-light-muted dark:text-dark-muted sm:text-xs">{city.rooms} rooms - {money(city.averageRent)} avg</p>
              <p className="mt-2 text-xs font-black text-cyan-600 dark:text-cyan-300 sm:mt-3 sm:text-sm">{city.views || 0} views</p>
            </div>
          )) : <EmptyState title="No city data" description="Cities appear after listings include location data." />}
        </div>
      </Card>
    </PageShell>
  );
};

const VerificationPanel = ({ data }) => (
  <PageShell eyebrow="Trust & Safety" title="KYC & Verification Center" subtitle="Review user verification signals and property documents before risk reaches the marketplace.">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <MetricCard label="Verified users" value={data?.totals?.verified || 0} icon={ShieldCheck} tone="green" to="/admin/users" />
      <MetricCard label="Unverified users" value={data?.totals?.unverified || 0} icon={Users} tone="amber" to="/admin/verifications" />
      <MetricCard label="Identity checks" value={data?.totals?.identityVerified || 0} icon={CheckCircle2} tone="cyan" to="/admin/verifications" />
      <MetricCard label="Property checks" value={data?.totals?.propertyVerified || 0} icon={Home} tone="violet" to="/admin/rooms?status=Pending" />
    </div>

    <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
      <Card title="Pending User Verification" subtitle="Users needing manual trust review">
        <div className="space-y-3">
          {(data?.pendingKycUsers || []).length ? data.pendingKycUsers.map((user) => (
            <Link key={user._id} to={`/admin/users/${user._id}`} className="block rounded-2xl border border-light-border bg-light-bg p-3 transition hover:border-cyan-300 hover:shadow-md dark:border-dark-border dark:bg-dark-input dark:hover:border-cyan-700/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="truncate text-xs font-semibold text-light-muted dark:text-dark-muted">{user.email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(user.kyc_status)}`}>{user.kyc_status || 'Unverified'}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">Joined {dateLabel(user.createdAt)}</p>
            </Link>
          )) : <EmptyState title="No pending KYC" description="Users needing review will appear here." />}
        </div>
      </Card>

      <Card title="Property Verification Queue" subtitle="Rooms needing document or publishing review">
        <div className="space-y-3">
          {(data?.pendingPropertyRooms || []).length ? data.pendingPropertyRooms.map((room) => (
            <Link key={room._id} to={`/admin/rooms/${room._id}/review`} className="block rounded-2xl border border-light-border bg-light-bg p-3 transition hover:border-cyan-300 hover:shadow-md dark:border-dark-border dark:bg-dark-input dark:hover:border-cyan-700/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-bold">{formatListingTitle(room.title)}</p>
                  <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{room.landlord?.name || 'Unknown landlord'} - {room.location?.city || 'City missing'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(room.status)}`}>{room.status}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">{room.documents?.length || 0} document(s) uploaded</p>
            </Link>
          )) : <EmptyState title="No property queue" description="Pending property checks will appear here." />}
        </div>
      </Card>
    </div>
  </PageShell>
);

const RevenuePanel = ({ data }) => (
  <PageShell eyebrow="Financials" title="Revenue & Commission" subtitle="Track booking value, platform fee, transaction health, pending payment and payout exposure.">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      <MetricCard label="Gross value" value={money(data?.summary?.grossBookingValue)} icon={CreditCard} tone="green" />
      <MetricCard label="Platform fee" value={money(data?.summary?.platformFees)} icon={TrendingUp} tone="cyan" />
      <MetricCard label="Pending payments" value={money(data?.summary?.pendingPayments)} icon={FileClock} tone="amber" />
      <MetricCard label="Paid payments" value={money(data?.summary?.paidPayments)} icon={CheckCircle2} tone="violet" />
    </div>

    <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
      <Card title="Landlord Payout Exposure" subtitle="Estimated payout from approved or confirmed applications">
        <div className="space-y-3">
          {(data?.payoutByLandlord || []).length ? data.payoutByLandlord.map((row) => (
            <div key={row._id || row.landlord?.email} className="flex items-center justify-between rounded-2xl bg-light-bg p-3 dark:bg-dark-input">
              <div>
                <p className="font-bold">{row.landlord?.name || 'Unknown landlord'}</p>
                <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{row.applications} application(s)</p>
              </div>
              <p className="font-black text-cyan-600 dark:text-cyan-300">{money(row.payoutEstimate)}</p>
            </div>
          )) : <EmptyState title="No payout exposure" description="Payout estimates appear after approved applications." />}
        </div>
      </Card>

      <Card title="Recent Transactions" subtitle="Payment provider records when transactions exist">
        <div className="space-y-3">
          {(data?.recentTransactions || []).length ? data.recentTransactions.map((txn) => (
            <div key={txn._id} className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-input">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{txn.type?.replace('_', ' ') || 'Transaction'}</p>
                  <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{dateLabel(txn.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(txn.status)}`}>{txn.status}</span>
              </div>
              <p className="mt-2 text-sm font-black">{money(txn.amount)}</p>
            </div>
          )) : <EmptyState title="No transaction records" description="Transactions will appear after payment integration creates records." />}
        </div>
      </Card>
    </div>
  </PageShell>
);

const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
const statusWeight = { open: 4, in_progress: 3, resolved: 1, closed: 0 };
const riskCategoryWeight = { safety: 4, payment: 4, damage: 4, refund: 4, account: 3, booking: 3, listing: 2, verification: 2, other: 1 };
const categoryLabels = {
  account: 'Account / ban',
  listing: 'Room approval',
  booking: 'Booking',
  payment: 'Payment',
  verification: 'KYC',
  safety: 'Safety',
  damage: 'Damage',
  refund: 'Refund',
  other: 'Other',
};

const ticketAgeLabel = (value) => {
  if (!value) return 'No time';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return dateLabel(value);
};

const getTicketParts = (ticket = {}) => {
  const [issueText = '', contextText = ''] = String(ticket.issueDescription || '').split('\n---\nContext\n');
  return { issueText: issueText.trim(), contextText: contextText.trim() };
};

const isUnresolvedTicket = (ticket = {}) => !['resolved', 'closed'].includes(ticket.status);

const getTicketScore = (ticket = {}) => {
  const evidenceCount = ticket.evidence?.length || 0;
  return (
    (statusWeight[ticket.status] || 0) * 100 +
    (priorityWeight[ticket.priority] || 0) * 40 +
    (riskCategoryWeight[ticket.category] || 0) * 12 +
    (ticket.escrowAction === 'freeze' ? 25 : 0) +
    Math.min(evidenceCount, 4) * 3
  );
};

const sortTicketsForAdmin = (items = []) => [...items].sort((a, b) => {
  const scoreDiff = getTicketScore(b) - getTicketScore(a);
  if (scoreDiff) return scoreDiff;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
});

const TicketPill = ({ children, tone = 'cyan' }) => {
  const tones = {
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    red: 'bg-red-500/10 text-red-700 dark:text-red-200',
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    slate: 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tones[tone] || tones.cyan}`}>{children}</span>;
};

const TicketListItem = ({ ticket, selected, onSelect }) => {
  const { issueText } = getTicketParts(ticket);
  const isHot = ticket.priority === 'urgent' || ticket.priority === 'high' || ticket.escrowAction === 'freeze';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full rounded-[1.35rem] border p-3 text-left transition active:scale-[0.99] ${
        selected
          ? 'border-cyan-400 bg-cyan-50 shadow-[0_14px_38px_-30px_rgba(8,145,178,0.7)] dark:border-cyan-500/70 dark:bg-cyan-950/25'
          : 'border-light-border bg-white hover:border-cyan-300 hover:bg-cyan-50/60 dark:border-dark-border dark:bg-slate-950/35 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/18'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${isHot ? 'bg-red-500 text-white' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200'}`}>
          {isHot ? <AlertTriangle className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm font-black">{ticket.subject || 'Support request'}</span>
            <TicketPill tone={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'red' : 'amber'}>{ticket.priority}</TicketPill>
          </span>
          <span className="mt-1 block rr-line-clamp-2 text-xs font-semibold leading-5 text-light-muted dark:text-dark-muted">{issueText || 'No message provided.'}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-light-muted dark:text-dark-muted">
            <span className="truncate">{ticket.user?.name || 'Unknown user'}</span>
            <span>{ticketAgeLabel(ticket.createdAt)}</span>
            {ticket.evidence?.length > 0 && <span>{ticket.evidence.length} proof</span>}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <TicketPill tone={ticket.status === 'open' ? 'amber' : ticket.status === 'in_progress' ? 'cyan' : ticket.status === 'resolved' ? 'green' : 'slate'}>{ticket.status}</TicketPill>
            <TicketPill tone="cyan">{categoryLabels[ticket.category] || ticket.issueType || 'General'}</TicketPill>
            {ticket.escrowAction === 'freeze' && <TicketPill tone="red">Escrow frozen</TicketPill>}
          </span>
        </span>
      </div>
    </button>
  );
};

const TicketDetailPanel = ({ ticket, onUpdate, currentAdmin }) => {
  const [saving, setSaving] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    setResolutionNote(ticket?.resolutionNote || '');
    setSaving('');
  }, [ticket?._id, ticket?.resolutionNote]);

  if (!ticket) {
    return <EmptyState title="Select a support ticket" description="Choose a ticket from the queue to read the full message and take action." />;
  }

  const { issueText, contextText } = getTicketParts(ticket);
  const updateTicket = async (updates, actionKey) => {
    setSaving(actionKey);
    await onUpdate(ticket._id, updates);
    setSaving('');
  };
  const assignedName = ticket.assignedAdmin?.name || (String(ticket.assignedAdmin || '') === currentAdmin?._id ? currentAdmin?.name : '');

  return (
    <div className="rounded-[1.35rem] border border-light-border bg-white p-4 shadow-sm dark:border-dark-border dark:bg-slate-950/55 sm:rounded-3xl sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TicketPill tone={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'red' : 'amber'}>P{priorityWeight[ticket.priority] || 1} priority</TicketPill>
            <TicketPill tone={ticket.status === 'open' ? 'amber' : ticket.status === 'in_progress' ? 'cyan' : ticket.status === 'resolved' ? 'green' : 'slate'}>{ticket.status}</TicketPill>
            {ticket.escrowAction === 'freeze' && <TicketPill tone="red">Escrow frozen</TicketPill>}
          </div>
          <h3 className="mt-3 break-words text-xl font-black leading-tight">{ticket.subject || 'Support request'}</h3>
          <p className="mt-1 text-xs font-bold text-light-muted dark:text-dark-muted">
            {ticket.user?.name || 'Unknown user'}{ticket.user?.email ? ` - ${ticket.user.email}` : ''} - {dateLabel(ticket.createdAt)}
          </p>
        </div>
        <select
          value={ticket.priority || 'medium'}
          onChange={(event) => updateTicket({ priority: event.target.value }, 'priority')}
          disabled={Boolean(saving)}
          className="min-h-11 rounded-2xl border border-light-border bg-light-bg px-3 text-xs font-black uppercase outline-none dark:border-dark-border dark:bg-dark-input"
          aria-label="Change ticket priority"
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="mt-4 rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Message</p>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{issueText || 'No message provided.'}</p>
      </div>

      {contextText && (
        <div className="mt-3 rounded-3xl bg-white p-4 text-sm font-semibold leading-6 text-light-muted ring-1 ring-light-border dark:bg-slate-950/50 dark:text-dark-muted dark:ring-dark-border">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Context</p>
          <p className="whitespace-pre-line">{contextText}</p>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-light-bg p-3 dark:bg-dark-input">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Category</p>
          <p className="mt-1 text-sm font-black">{categoryLabels[ticket.category] || ticket.category || 'Other'} - {ticket.issueType || 'general'}</p>
        </div>
        <div className="rounded-2xl bg-light-bg p-3 dark:bg-dark-input">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Assigned</p>
          <p className="mt-1 text-sm font-black">{assignedName || 'Not taken yet'}</p>
        </div>
        {ticket.room?.title && (
          <div className="rounded-2xl bg-light-bg p-3 dark:bg-dark-input sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Room</p>
            <p className="mt-1 text-sm font-black">{formatListingTitle(ticket.room.title)}</p>
            {ticket.room?.location?.city && <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{ticket.room.location.city}</p>}
          </div>
        )}
        {ticket.requestedAmount > 0 && (
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-200">
            <p className="text-[10px] font-black uppercase tracking-[0.12em]">Claim amount</p>
            <p className="mt-1 text-sm font-black">{money(ticket.requestedAmount)}</p>
          </div>
        )}
      </div>

      {ticket.evidence?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Proof files</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ticket.evidence.map((item, index) => (
              <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="rounded-full border border-cyan-200 bg-cyan-500/10 px-3 py-2 text-[11px] font-black text-cyan-700 transition hover:bg-cyan-500 hover:text-white dark:border-cyan-400/20 dark:text-cyan-200">
                Proof {index + 1}{item.type ? ` - ${item.type}` : ''}
              </a>
            ))}
          </div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Admin note</span>
        <textarea
          value={resolutionNote}
          onChange={(event) => setResolutionNote(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-input"
          placeholder="Add what you checked or what action was taken."
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-light-border pt-4 dark:border-dark-border sm:flex sm:flex-wrap">
        {ticket.status !== 'in_progress' && (
          <button type="button" disabled={Boolean(saving)} onClick={() => updateTicket({ status: 'in_progress', assignedAdmin: currentAdmin?._id }, 'in_progress')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-500/10 px-4 text-xs font-black text-amber-700 disabled:opacity-60 dark:border-amber-400/20 dark:text-amber-200">
            <UserCheck className="h-4 w-4" />
            {saving === 'in_progress' ? 'Saving...' : 'Take up'}
          </button>
        )}
        {ticket.status !== 'resolved' && (
          <button type="button" disabled={Boolean(saving)} onClick={() => updateTicket({ status: 'resolved', resolutionNote: resolutionNote || 'Resolved from admin support queue.' }, 'resolved')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-500/10 px-4 text-xs font-black text-emerald-700 disabled:opacity-60 dark:border-emerald-400/20 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {saving === 'resolved' ? 'Saving...' : 'Resolve'}
          </button>
        )}
        {ticket.status !== 'closed' && (
          <button type="button" disabled={Boolean(saving)} onClick={() => updateTicket({ status: 'closed', resolutionNote: resolutionNote || ticket.resolutionNote }, 'closed')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <XCircle className="h-4 w-4" />
            {saving === 'closed' ? 'Saving...' : 'Close'}
          </button>
        )}
        {ticket.status !== 'open' && (
          <button type="button" disabled={Boolean(saving)} onClick={() => updateTicket({ status: 'open' }, 'open')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-500/10 px-4 text-xs font-black text-cyan-700 disabled:opacity-60 dark:border-cyan-400/20 dark:text-cyan-200">
            <Clock3 className="h-4 w-4" />
            {saving === 'open' ? 'Saving...' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
  );
};

const TicketsPanel = ({ data }) => {
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const [tickets, setTickets] = useState(() => sortTicketsForAdmin(data?.tickets || []));
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [queueFilter, setQueueFilter] = useState('attention');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const sorted = sortTicketsForAdmin(data?.tickets || []);
    setTickets(sorted);
    setSelectedTicketId((current) => (current && sorted.some((ticket) => ticket._id === current) ? current : sorted[0]?._id || ''));
  }, [data?.tickets]);

  const refreshTickets = useCallback(async ({ silent = false } = {}) => {
    try {
      setRefreshing(true);
      const { data: response } = await api.get('/admin/tickets');
      const sorted = sortTicketsForAdmin(response?.tickets || []);
      setTickets(sorted);
      setSelectedTicketId((current) => (current && sorted.some((ticket) => ticket._id === current) ? current : sorted[0]?._id || ''));
      notifyAdminCountsChanged();
      if (!silent) {
        triggerHaptic('success');
        toast.success('Support queue refreshed.');
      }
    } catch (error) {
      if (!silent) triggerHaptic('error');
      toast.error(error.response?.data?.message || 'Could not refresh support queue.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNewTicket = () => {
      triggerHaptic('warning');
      toast.success('New support ticket received.');
      notifyAdminCountsChanged();
      refreshTickets({ silent: true });
    };
    socket.on('admin_support_ticket_created', handleNewTicket);
    return () => socket.off('admin_support_ticket_created', handleNewTicket);
  }, [refreshTickets, socket]);

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const { data: updatedTicket } = await api.patch(`/admin/tickets/${ticketId}`, updates);
      setTickets((current) => sortTicketsForAdmin(current.map((ticket) => (ticket._id === ticketId ? updatedTicket : ticket))));
      setSelectedTicketId(updatedTicket._id);
      triggerHaptic('success');
      toast.success('Ticket updated.');
      notifyAdminCountsChanged();
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.message || 'Could not update ticket.');
    }
  };

  const stats = useMemo(() => {
    const unresolved = tickets.filter(isUnresolvedTicket);
    return {
      total: tickets.length,
      attention: unresolved.length,
      urgent: tickets.filter((ticket) => isUnresolvedTicket(ticket) && ['urgent', 'high'].includes(ticket.priority)).length,
      escrow: tickets.filter((ticket) => isUnresolvedTicket(ticket) && ticket.escrowAction === 'freeze').length,
      mine: tickets.filter((ticket) => String(ticket.assignedAdmin?._id || ticket.assignedAdmin || '') === String(user?._id || '')).length,
    };
  }, [tickets, user?._id]);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (queueFilter === 'attention' && !isUnresolvedTicket(ticket)) return false;
      if (queueFilter === 'open' && ticket.status !== 'open') return false;
      if (queueFilter === 'in_progress' && ticket.status !== 'in_progress') return false;
      if (queueFilter === 'mine' && String(ticket.assignedAdmin?._id || ticket.assignedAdmin || '') !== String(user?._id || '')) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
      if (!query) return true;
      const haystack = [
        ticket.subject,
        ticket.issueDescription,
        ticket.user?.name,
        ticket.user?.email,
        ticket.room?.title,
        ticket.category,
        ticket.issueType,
        ticket.status,
        ticket.priority,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [categoryFilter, priorityFilter, queueFilter, searchTerm, tickets, user?._id]);

  const selectedTicket = useMemo(() => (
    filteredTickets.find((ticket) => ticket._id === selectedTicketId) || filteredTickets[0] || null
  ), [filteredTickets, selectedTicketId]);

  useEffect(() => {
    if (selectedTicket?._id && selectedTicket._id !== selectedTicketId) {
      setSelectedTicketId(selectedTicket._id);
    }
  }, [selectedTicket?._id, selectedTicketId]);

  const queueTabs = [
    { value: 'attention', label: 'Needs action', count: stats.attention },
    { value: 'open', label: 'Open', count: tickets.filter((ticket) => ticket.status === 'open').length },
    { value: 'in_progress', label: 'Taken up', count: tickets.filter((ticket) => ticket.status === 'in_progress').length },
    { value: 'mine', label: 'Mine', count: stats.mine },
    { value: 'all', label: 'All', count: stats.total },
  ];

  return (
    <PageShell eyebrow="Resolution Center" title="Support & Disputes" subtitle="Important tickets are sorted first, with quick filters for support, safety, payment, ban review, and room approval issues.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <MetricCard label="Needs action" value={stats.attention} icon={Inbox} tone="amber" />
        <MetricCard label="Urgent or high" value={stats.urgent} icon={AlertTriangle} tone="red" />
        <MetricCard label="Escrow frozen" value={stats.escrow} icon={ShieldCheck} tone="violet" />
        <MetricCard label="My tickets" value={stats.mine} icon={UserCheck} tone="cyan" />
      </div>

      <Card title="Support Inbox" subtitle="Select one ticket, read the full message, then take it up or resolve it.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {queueTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setQueueFilter(tab.value)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-black transition ${
                  queueFilter === tab.value
                    ? 'border-cyan-400 bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'border-light-border bg-white text-slate-700 hover:border-cyan-300 dark:border-dark-border dark:bg-slate-950 dark:text-slate-200'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${queueFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{tab.count}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => refreshTickets()}
              disabled={refreshing}
              className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-light-border bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-60 dark:border-dark-border dark:bg-slate-950 dark:text-slate-200"
            >
              <Clock3 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input-field pl-11"
                placeholder="Search user, email, room, message..."
              />
            </label>
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" />
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="input-field pl-11">
                <option value="all">All priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input-field">
              <option value="all">All issue types</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)]">
            <div className="order-2 max-h-[72vh] space-y-2 overflow-y-auto pr-1 lg:order-1">
              {filteredTickets.length ? filteredTickets.map((ticket) => (
                <TicketListItem
                  key={ticket._id}
                  ticket={ticket}
                  selected={selectedTicket?._id === ticket._id}
                  onSelect={() => setSelectedTicketId(ticket._id)}
                />
              )) : (
                <EmptyState title="No matching tickets" description="Try another filter or search term." />
              )}
            </div>
            <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
              <TicketDetailPanel ticket={selectedTicket} onUpdate={handleUpdateTicket} currentAdmin={user} />
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
};

const LogsPanel = ({ data }) => (
  <PageShell eyebrow="System" title="Audit Logs" subtitle="Track sensitive admin actions such as approvals, role changes, bans, deletes, and settings updates.">
    <Card title="Recent Admin Actions" subtitle="Latest 100 governance events">
      <div className="space-y-3">
        {(data || []).length ? data.map((log) => (
          <div key={log._id} className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-input">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black">{log.action?.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">
                  {log.admin?.name || 'System'} - {log.targetType} - {dateLabel(log.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-300">{log.ipAddress || 'No IP'}</span>
            </div>
          </div>
        )) : <EmptyState title="No audit logs yet" description="Admin actions will be recorded here automatically." />}
      </div>
    </Card>
  </PageShell>
);

const SettingsPanel = ({ data, setData }) => {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [savingSwitch, setSavingSwitch] = useState('');

  useEffect(() => {
    setForm({ ...(data || {}), ...(settings || {}) });
  }, [data, settings]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        platformFee: Number(form.platformFee || 0),
        platformFeePercentage: Number(form.platformFeePercentage || 0),
        commissionPercent: Number(form.commissionPercent || 0),
        maintenanceMode: Boolean(form.maintenanceMode),
        allowNewSignups: Boolean(form.allowNewSignups),
        supportEmail: form.supportEmail || '',
        verificationRequired: Boolean(form.verificationRequired),
        autoPublishVerifiedLandlords: Boolean(form.autoPublishVerifiedLandlords),
        bookingRequestExpiryHours: Number(form.bookingRequestExpiryHours || 24),
        payoutHoldHoursAfterCheckIn: Number(form.payoutHoldHoursAfterCheckIn || 24),
        disputeWindowHoursAfterCheckIn: Number(form.disputeWindowHoursAfterCheckIn || 72),
        escrowEnabled: Boolean(form.escrowEnabled),
        offlinePaymentAllowed: Boolean(form.offlinePaymentAllowed),
      };
      const response = await updateSettings(payload);
      setData(response);
      triggerHaptic('success');
      toast.success('Platform settings updated.');
    } catch (err) {
      triggerHaptic('error');
      toast.error('Could not update settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSwitch = async (key) => {
    const nextValue = !form[key];
    const nextForm = { ...form, [key]: nextValue };
    setForm(nextForm);
    setSavingSwitch(key);

    try {
      const response = await updateSettings({ [key]: nextValue });
      setData(response);
      triggerHaptic('success');
      toast.success(`${key.replace(/([A-Z])/g, ' $1')} is ${nextValue ? 'ON' : 'OFF'}.`);
    } catch (error) {
      setForm(form);
      triggerHaptic('error');
      toast.error('Could not update platform switch.');
    } finally {
      setSavingSwitch('');
    }
  };

  return (
    <PageShell eyebrow="System Settings" title="Platform Settings" subtitle="Control fee defaults, verification behavior, maintenance mode, and support routing from one place.">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Business Controls" subtitle="These values are saved in MongoDB and used by the platform admin layer.">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold">Platform fee</span>
                <input className="input-field" type="number" min="0" value={form.platformFee ?? 0} onChange={(event) => updateField('platformFee', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold">Commission percent</span>
                <input className="input-field" type="number" min="0" max="100" value={form.commissionPercent ?? 0} onChange={(event) => updateField('commissionPercent', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold">Platform fee percentage</span>
                <input className="input-field" type="number" min="0" max="100" value={form.platformFeePercentage ?? 0} onChange={(event) => updateField('platformFeePercentage', event.target.value)} />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-bold">Support email</span>
                <input className="input-field" type="email" value={form.supportEmail ?? ''} onChange={(event) => updateField('supportEmail', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold">Booking expiry hours</span>
                <input className="input-field" type="number" min="1" max="168" value={form.bookingRequestExpiryHours ?? 24} onChange={(event) => updateField('bookingRequestExpiryHours', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold">Payout hold after check-in</span>
                <input className="input-field" type="number" min="0" max="720" value={form.payoutHoldHoursAfterCheckIn ?? 24} onChange={(event) => updateField('payoutHoldHoursAfterCheckIn', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold">Dispute window hours</span>
                <input className="input-field" type="number" min="1" max="720" value={form.disputeWindowHoursAfterCheckIn ?? 72} onChange={(event) => updateField('disputeWindowHoursAfterCheckIn', event.target.value)} />
              </label>
            </div>
          </Card>
        </div>
        <Card title="Operational Switches" subtitle="Toggle platform-level behavior safely.">
          <div className="space-y-3">
            {[
              ['maintenanceMode', 'Maintenance mode'],
              ['allowNewSignups', 'Allow new signups'],
              ['verificationRequired', 'Require verification'],
              ['autoPublishVerifiedLandlords', 'Auto-publish verified landlords'],
              ['escrowEnabled', 'Escrow workflow'],
              ['offlinePaymentAllowed', 'Allow offline payments'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSwitch(key)}
                disabled={Boolean(savingSwitch)}
                className="flex w-full items-center justify-between rounded-2xl border border-light-border bg-light-bg p-3 text-left transition hover:border-cyan-300 disabled:cursor-wait disabled:opacity-70 dark:border-dark-border dark:bg-dark-input"
              >
                <span>
                  <span className="block text-sm font-bold">{label}</span>
                  {savingSwitch === key && <span className="text-xs font-semibold text-cyan-500">Saving to MongoDB...</span>}
                </span>
                <span className={`h-6 w-11 rounded-full p-1 transition ${form[key] ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-dark-border'}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition ${form[key] ? 'translate-x-5' : ''}`} />
                </span>
              </button>
            ))}
          </div>
          <button onClick={saveSettings} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-600 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </Card>
      </div>
    </PageShell>
  );
};

const sectionMeta = {
  analytics: { icon: BarChart3 },
  verifications: { icon: ShieldCheck },
  revenue: { icon: CreditCard },
  tickets: { icon: Headphones },
  logs: { icon: Activity },
  settings: { icon: Settings },
};

const AdminInsightsPage = ({ section = 'analytics' }) => {
  const { data, setData, loading, error } = useAdminResource(section);
  const Icon = useMemo(() => sectionMeta[section]?.icon || BarChart3, [section]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  }

  if (error) {
    return (
      <PageShell eyebrow="Admin" title="Section unavailable" subtitle={error}>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-600 dark:border-red-900/50 dark:bg-red-950/20">
          <Icon className="mb-3 h-6 w-6" />
          <p className="font-bold">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (section === 'verifications') return <VerificationPanel data={data} />;
  if (section === 'revenue') return <RevenuePanel data={data} />;
  if (section === 'tickets') return <TicketsPanel data={data} />;
  if (section === 'logs') return <LogsPanel data={data} />;
  if (section === 'settings') return <SettingsPanel data={data} setData={setData} />;
  return <AnalyticsPanel data={data} />;
};

export default AdminInsightsPage;
