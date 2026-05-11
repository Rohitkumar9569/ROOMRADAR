import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ShieldAlert } from 'lucide-react';

const AccountRestrictedPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-light-bg px-4 py-10 text-light-text dark:bg-dark-bg dark:text-dark-text">
    <div className="w-full max-w-xl rounded-[2rem] border border-light-border bg-white p-6 text-center shadow-2xl shadow-slate-950/10 dark:border-dark-border dark:bg-dark-sidebar sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-500">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Account restricted</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Your account is temporarily blocked</h1>
      <p className="mt-3 text-sm font-semibold leading-7 text-light-muted dark:text-dark-muted">
        An admin has restricted this account for safety review. You can contact support if you believe this is a mistake.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-light-border px-5 py-3 text-sm font-black transition hover:border-cyan-400 dark:border-dark-border">
          <Lock className="h-4 w-4" /> Back to login
        </Link>
        <a href="mailto:support@roomradar.in" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-black text-white transition hover:bg-brand-dark">
          <Mail className="h-4 w-4" /> Contact support
        </a>
      </div>
    </div>
  </main>
);

export default AccountRestrictedPage;
