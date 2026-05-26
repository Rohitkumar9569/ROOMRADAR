import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { adminNavigation, formatAdminBadgeCount, getAdminNavigationBadge } from '../../../config/adminNavigation';
import { canAccessAdminItem } from '../../../utils/adminPermissions';

const AdminSidebar = ({ counts = {} }) => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const visibleNavigation = adminNavigation
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => canAccessAdminItem(user, item)),
        }))
        .filter((section) => section.items.length > 0);

    const isItemActive = (path) => {
        const [pathname, query] = path.split('?');
        if (location.pathname !== pathname) return false;
        if (query) return location.search === `?${query}`;
        return location.search === '';
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-light-border bg-white/90 p-4 text-light-text shadow-sm backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar/95 dark:text-dark-text md:flex">
            <Link to="/admin/dashboard" className="mb-5 flex items-center gap-3 rounded-3xl border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[15px] font-black leading-none shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                    <span className="text-brand">R</span><span className="text-cyan-500">R</span>
                </div>
                <div>
                    <p className="text-lg font-black tracking-tight">
                        <span className="text-brand">Room</span><span className="text-cyan-500">Radar</span>
                    </p>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-light-muted dark:text-dark-muted">Admin OS</p>
                </div>
            </Link>

            <div className="mb-5 rounded-3xl border border-light-border bg-light-card p-3 dark:border-dark-border dark:bg-dark-card">
                <p className="truncate text-sm font-bold">{user?.name || 'Administrator'}</p>
                <p className="truncate text-xs font-medium text-light-muted dark:text-dark-muted">{user?.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {(user?.roles || ['Admin']).filter(role => ['Admin', 'Super_Admin', 'Moderator', 'Support'].includes(role)).map(role => (
                        <span key={role} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                            {role.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                {visibleNavigation.map((section) => (
                    <div key={section.section}>
                        <p className="mb-2 px-3 text-xs font-black uppercase tracking-[0.16em] text-light-muted dark:text-dark-muted">
                            {section.section}
                        </p>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const active = isItemActive(item.path);
                                const badge = getAdminNavigationBadge(item, counts);
                                return (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        className={`group flex items-center gap-3 rounded-2xl border-l-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                                            active
                                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                                                : 'border-transparent text-light-muted hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-dark-text'
                                        }`}
                                    >
                                        <item.icon className={`h-4 w-4 ${active ? 'text-cyan-500' : 'text-light-muted group-hover:text-cyan-500 dark:text-dark-muted'}`} />
                                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                        {badge > 0 && (
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${
                                                active
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-300'
                                            }`}>
                                                {formatAdminBadgeCount(badge)}
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="mt-4 space-y-2 border-t border-light-border pt-4 dark:border-dark-border">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-2xl border border-light-border bg-light-card px-3 py-2.5 text-sm font-semibold transition-all hover:border-cyan-400 dark:border-dark-border dark:bg-dark-card"
                >
                    <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
                    {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-cyan-500" />}
                </button>
                <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-500/10">
                    <LogOut size={18} /> Log out
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
