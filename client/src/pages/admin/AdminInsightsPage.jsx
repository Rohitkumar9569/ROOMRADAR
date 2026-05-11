import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileClock,
  Headphones,
  Home,
  Save,
  Settings,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

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

const MetricCard = ({ label, value, icon: Icon, tone = 'cyan', detail }) => {
  const tones = {
    cyan: 'text-cyan-500 bg-cyan-500/10',
    green: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-4">
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
      <MetricCard label="Verified users" value={data?.totals?.verified || 0} icon={ShieldCheck} tone="green" />
      <MetricCard label="Unverified users" value={data?.totals?.unverified || 0} icon={Users} tone="amber" />
      <MetricCard label="Identity checks" value={data?.totals?.identityVerified || 0} icon={CheckCircle2} tone="cyan" />
      <MetricCard label="Property checks" value={data?.totals?.propertyVerified || 0} icon={Home} tone="violet" />
    </div>

    <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
      <Card title="Pending User Verification" subtitle="Users needing manual trust review">
        <div className="space-y-3">
          {(data?.pendingKycUsers || []).length ? data.pendingKycUsers.map((user) => (
            <div key={user._id} className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-input">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="truncate text-xs font-semibold text-light-muted dark:text-dark-muted">{user.email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(user.kyc_status)}`}>{user.kyc_status || 'Unverified'}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">Joined {dateLabel(user.createdAt)}</p>
            </div>
          )) : <EmptyState title="No pending KYC" description="Users needing review will appear here." />}
        </div>
      </Card>

      <Card title="Property Verification Queue" subtitle="Rooms needing document or publishing review">
        <div className="space-y-3">
          {(data?.pendingPropertyRooms || []).length ? data.pendingPropertyRooms.map((room) => (
            <div key={room._id} className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-input">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-bold">{room.title}</p>
                  <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{room.landlord?.name || 'Unknown landlord'} - {room.location?.city || 'City missing'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(room.status)}`}>{room.status}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">{room.documents?.length || 0} document(s) uploaded</p>
            </div>
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

const TicketsPanel = ({ data }) => (
  <PageShell eyebrow="Resolution Center" title="Support & Disputes" subtitle="Freeze escrow, review evidence, and resolve booking, refund, safety, and deposit issues from one operational queue.">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      <MetricCard label="Tickets" value={data?.tickets?.length || 0} icon={Ticket} tone="cyan" />
      <MetricCard label="Status groups" value={data?.statusBreakdown?.length || 0} icon={Activity} tone="violet" />
      <MetricCard label="Priority groups" value={data?.priorityBreakdown?.length || 0} icon={Headphones} tone="amber" />
    </div>

    <Card title="Ticket Queue" subtitle="Newest support tickets first">
      <div className="space-y-3">
        {(data?.tickets || []).length ? data.tickets.map((ticket) => (
          <div key={ticket._id} className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-input">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-black">{ticket.subject}</p>
                  {ticket.escrowAction === 'freeze' && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-600 dark:text-red-300">Escrow frozen</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-light-muted dark:text-dark-muted">{ticket.issueDescription}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-light-muted dark:text-dark-muted">
                  <span>{ticket.user?.name || 'Unknown user'}</span>
                  <span>-</span>
                  <span>{dateLabel(ticket.createdAt)}</span>
                  {ticket.room?.title && <span>- {ticket.room.title}</span>}
                  {ticket.requestedAmount > 0 && <span>- Claim {money(ticket.requestedAmount)}</span>}
                  {ticket.evidence?.length > 0 && <span>- {ticket.evidence.length} evidence files</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(ticket.status)}`}>{ticket.status}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(ticket.priority)}`}>{ticket.priority}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(ticket.issueType)}`}>{ticket.issueType || 'general'}</span>
              </div>
            </div>
          </div>
        )) : <EmptyState title="No support tickets" description="Support tickets will appear here when users report issues." />}
      </div>
    </Card>
  </PageShell>
);

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
      toast.success('Platform settings updated.');
    } catch (err) {
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
      toast.success(`${key.replace(/([A-Z])/g, ' $1')} is ${nextValue ? 'ON' : 'OFF'}.`);
    } catch (error) {
      setForm(form);
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
