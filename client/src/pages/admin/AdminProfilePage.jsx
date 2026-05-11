import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Mail, Moon, ShieldCheck, Sun, UserCircle } from 'lucide-react';

const AdminProfilePage = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminRoles = (user?.roles || []).filter((role) =>
    ['Admin', 'Super_Admin', 'Moderator', 'Support'].includes(role)
  );

  return (
    <div className="min-h-screen bg-light-bg px-4 py-5 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card">
          <div className="relative bg-gradient-to-br from-cyan-500 via-cyan-600 to-dark-sidebar p-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_32%)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                  {user?.profilePicture || user?.avatarUrl ? (
                    <img src={user.profilePicture || user.avatarUrl} alt={user?.name} className="h-full w-full rounded-3xl object-cover" />
                  ) : (
                    <UserCircle className="h-11 w-11" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Administrator</p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{user?.name || 'Admin'}</h1>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-cyan-50">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/20"
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4" />}
                {isDarkMode ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
              <ShieldCheck className="mb-3 h-5 w-5 text-cyan-500" />
              <p className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">Access</p>
              <p className="mt-1 font-black">Admin OS</p>
            </div>
            <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
              <UserCircle className="mb-3 h-5 w-5 text-emerald-500" />
              <p className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">Roles</p>
              <p className="mt-1 font-black">{adminRoles.length || 1}</p>
            </div>
            <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
              <Mail className="mb-3 h-5 w-5 text-violet-500" />
              <p className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">Identity</p>
              <p className="mt-1 truncate font-black">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card">
          <p className="text-sm font-black">Assigned roles</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(adminRoles.length ? adminRoles : ['Admin']).map((role) => (
              <span key={role} className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                {role.replace('_', ' ')}
              </span>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white transition hover:bg-red-600 active:scale-[0.98]"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
