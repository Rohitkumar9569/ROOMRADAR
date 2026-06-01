import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, FileText, LifeBuoy, LogOut, MessageSquare, RefreshCw, ShieldAlert } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import SupportTicketModal from '../components/support/SupportTicketModal';
import { getAccessScopeForPath, getRoleRestriction, getScopeHomePath, getScopeLabel, isAccountRestricted, isScopeRestricted, normalizeRoleScope } from '../utils/roleRestrictions';

const fallbackReason = 'RoomRadar Trust & Safety restricted this account after an admin review. Check your recent listings, bookings, messages, and verification details before requesting review.';

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Recently';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getHomeAfterRestore = (user, scope = 'account') => {
  const scopedHome = getScopeHomePath(scope);
  if (scopedHome !== '/') return scopedHome;
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (roles.includes('Landlord') && !isScopeRestricted(user, 'landlord')) return '/landlord/overview';
  return '/';
};

const AccountRestrictedPage = ({ restrictionScope }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser, updateUser } = useAuth();
  const effectiveScope = normalizeRoleScope(
    restrictionScope
    || (isAccountRestricted(user) ? 'account' : getAccessScopeForPath(location.pathname))
    || 'account'
  );
  const restriction = getRoleRestriction(user, effectiveScope);
  const roleLabel = effectiveScope === 'account' ? 'RoomRadar account' : `${getScopeLabel(effectiveScope)} access`;
  const isPending = restriction.appealStatus === 'pending';
  const alternativeAccess = effectiveScope === 'student' && user?.roles?.includes('Landlord') && !isScopeRestricted(user, 'landlord')
    ? { label: 'Continue to Landlord', path: '/landlord/overview' }
    : effectiveScope === 'landlord' && !isScopeRestricted(user, 'student')
      ? { label: 'Continue room search', path: '/' }
      : null;
  const [appealMessage, setAppealMessage] = useState(
    restriction.appealMessage || 'Please review my account restriction. I have checked my profile, listings, bookings, and messages, and I can share any required proof.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const freshUser = await refreshUser();
    setRefreshing(false);

    const restored = effectiveScope === 'account'
      ? freshUser?.status && freshUser.status !== 'Banned'
      : !isScopeRestricted(freshUser, effectiveScope);

    if (restored) {
      toast.success('Account restored. Welcome back.');
      navigate(getHomeAfterRestore(freshUser, effectiveScope), { replace: true });
      return;
    }

    toast.success('Status refreshed.');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSubmitAppeal = async (event) => {
    event.preventDefault();
    const message = appealMessage.trim();

    if (message.length < 20) {
      toast.error('Please add a little more detail for review.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/users/account-review', { message, roleScope: effectiveScope });
      if (data?.user) updateUser(data.user);
      toast.success(data?.message || 'Review request submitted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit review request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="rr-restricted-page min-h-screen bg-slate-50 px-4 py-6 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-10">
      <div className="rr-restricted-root mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rr-restricted-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rr-restricted-logo flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-black shadow-sm dark:bg-dark-card">
              <span className="text-brand">R</span><span className="text-cyan-500">R</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Trust & Safety</p>
              <p className="text-sm font-bold text-light-muted dark:text-dark-muted">RoomRadar account review</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="rr-restricted-logout inline-flex items-center gap-2 rounded-full border border-light-border bg-white px-4 py-2 text-xs font-black text-light-muted shadow-sm transition hover:border-red-300 hover:text-red-500 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </header>

        <section className="rr-restricted-shell overflow-hidden rounded-[2rem] border border-red-200/70 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.6)] dark:border-red-400/20 dark:bg-dark-sidebar">
          <div className="rr-restricted-grid grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rr-restricted-hero bg-slate-950 p-6 text-white sm:p-8">
              <div className="rr-restricted-icon flex h-16 w-16 items-center justify-center rounded-3xl bg-white/14 ring-1 ring-white/20">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <p className="rr-restricted-eyebrow mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-red-100">Account restricted</p>
              <h1 className="rr-restricted-title mt-3 max-w-xl text-[clamp(32px,8vw,56px)] font-black leading-[0.98] tracking-tight">
                Access is paused during safety review.
              </h1>
              <p className="rr-restricted-copy mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/82 sm:text-base">
                {effectiveScope === 'account'
                  ? `${user?.name || 'Your account'} cannot use booking, hosting, chat, or profile actions until RoomRadar reviews the restriction.`
                  : `${user?.name || 'This user'} cannot use ${getScopeLabel(effectiveScope).toLowerCase()} actions until RoomRadar reviews this restriction. Other active roles stay available.`}
              </p>

              <div className="rr-restricted-meta-grid mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rr-restricted-meta-card rounded-3xl bg-white/12 p-4 ring-1 ring-white/18">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">Account</p>
                  <p className="mt-2 break-words text-lg font-black">{roleLabel}</p>
                  <p className="mt-1 break-words text-xs font-semibold text-white/70">{user?.email || 'Signed in user'}</p>
                </div>
                <div className="rr-restricted-meta-card rounded-3xl bg-white/12 p-4 ring-1 ring-white/18">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">Review status</p>
                  <p className="mt-2 text-lg font-black">{isPending ? 'Request pending' : 'Action needed'}</p>
                  <p className="mt-1 text-xs font-semibold text-white/70">{formatDate(restriction.appealSubmittedAt || restriction.bannedAt)}</p>
                </div>
              </div>
            </div>

            <div className="rr-restricted-panel p-5 sm:p-7">
              <div className="rr-restricted-reason rounded-3xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-input">
                <div className="flex items-start gap-3">
                  <div className="rr-restricted-reason-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-red-500">Reason shown to user</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-light-text dark:text-dark-text">
                      {restriction.reason || fallbackReason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rr-restricted-steps mt-5 space-y-3">
                {[
                  ['Check activity', 'Review your recent listing edits, booking requests, payments, chat messages, and verification details.'],
                  ['Prepare proof', 'Keep identity proof, room ownership/rent proof, payment screenshots, or clarification ready if support asks.'],
                  ['Request review', 'Submit one clear review request. Creating another account can delay account restoration.'],
                ].map(([title, body], index) => (
                  <div key={title} className="flex gap-3">
                    <div className="rr-restricted-step-index flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-black text-cyan-600 dark:text-cyan-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-light-muted dark:text-dark-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rr-restricted-actions mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleRefresh} disabled={refreshing} className="rr-restricted-action inline-flex items-center justify-center gap-2 rounded-2xl border border-light-border bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:border-cyan-300 disabled:opacity-60 dark:border-dark-border dark:bg-dark-card">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh status
                </button>
                <button type="button" onClick={() => setSupportOpen(true)} className="rr-restricted-action inline-flex items-center justify-center gap-2 rounded-2xl border border-light-border bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card">
                  <MessageSquare className="h-4 w-4" /> Message support
                </button>
                {alternativeAccess && (
                  <button type="button" onClick={() => navigate(alternativeAccess.path, { replace: true })} className="rr-restricted-action inline-flex items-center justify-center gap-2 rounded-2xl border border-light-border bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card">
                    {alternativeAccess.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmitAppeal} className="rr-restricted-form rounded-[2rem] border border-light-border bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="rr-restricted-support-pill inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-600 dark:text-cyan-300">
                <LifeBuoy className="h-4 w-4" /> Review request
              </p>
              <h2 className="mt-4 text-2xl font-black tracking-tight">Tell Trust & Safety what should be reviewed</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                This creates or updates a high-priority support ticket for admins.
              </p>
            </div>
            {isPending && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Pending
              </span>
            )}
          </div>

          <label className="mt-5 block text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted" htmlFor="account-review-message">
            Your message
          </label>
          <textarea
            id="account-review-message"
            value={appealMessage}
            onChange={(event) => setAppealMessage(event.target.value)}
            rows={5}
            maxLength={1000}
            className="mt-2 min-h-36 w-full rounded-3xl border border-light-border bg-light-bg px-4 py-4 text-sm font-semibold leading-6 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-input"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-light-muted dark:text-dark-muted">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
              Mention the exact profile, listing, booking, or payment detail you want reviewed.
            </p>
            <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-60">
              {submitting ? 'Submitting...' : isPending ? 'Update request' : 'Request review'}
            </button>
          </div>
        </form>
        <SupportTicketModal
          open={supportOpen}
          onClose={() => setSupportOpen(false)}
          defaultCategory="account"
          defaultPriority="high"
          defaultSubject={`RoomRadar ${getScopeLabel(effectiveScope)} review - ${user?.email || 'user'}`}
          defaultMessage={`My ${roleLabel} is restricted and I want to request a review.\n\nReason shown: ${restriction.reason || fallbackReason}\n\nDetails:\n`}
          context={{ scope: effectiveScope, path: location.pathname }}
        />
      </div>
    </main>
  );
};

export default AccountRestrictedPage;
