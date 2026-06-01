import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Lock, Mail, ShieldCheck, Wrench } from 'lucide-react';

const MaintenancePage = ({ settings }) => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-light-bg px-4 py-10 text-light-text dark:bg-dark-bg dark:text-dark-text">
    <div className="absolute inset-x-0 top-0 h-72 bg-transparent" />
    <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-light-border bg-white p-6 text-center shadow-2xl shadow-slate-950/10 dark:border-dark-border dark:bg-dark-sidebar dark:shadow-black/30 sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-500">
        <Wrench className="h-8 w-8" />
      </div>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-500">RoomRadar maintenance</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">We are upgrading RoomRadar</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-7 text-light-muted dark:text-dark-muted">
        RoomRadar is temporarily locked while the admin team performs a rental service update. Admins can still sign in and manage rooms, requests, and support.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
          <ShieldCheck className="mx-auto mb-3 h-5 w-5 text-cyan-500" />
          <p className="text-sm font-black">Verified data safe</p>
        </div>
        <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
          <Lock className="mx-auto mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm font-black">Bookings protected</p>
        </div>
        <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
          <Mail className="mx-auto mb-3 h-5 w-5 text-blue-500" />
          <p className="text-sm font-black">{settings?.supportEmail || 'support@roomradar.in'}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/login" className="rounded-2xl bg-brand px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark">
          Admin login
        </Link>
        <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-light-border px-6 py-3 text-sm font-black transition hover:border-cyan-400 dark:border-dark-border">
          <Home className="h-4 w-4" />
          Check again
        </Link>
      </div>
    </div>
  </main>
);

export default MaintenancePage;
