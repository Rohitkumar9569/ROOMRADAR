import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Gauge,
  Heart,
  Home,
  Inbox,
  LifeBuoy,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { adminNavigation } from '../../config/adminNavigation';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdminItem, hasAdminPermission } from '../../utils/adminPermissions';
import { triggerHaptic } from '../../utils/haptics';

const adminRoles = ['Admin', 'Super_Admin', 'Moderator', 'Support'];

const normalize = (value) => String(value || '').toLowerCase();

const baseActions = [
  { id: 'home', label: 'Home', hint: 'Room discovery', path: '/', Icon: Home, keywords: 'landing travelling search' },
  { id: 'rooms', label: 'Search rooms', hint: 'Map and filters', path: '/rooms', Icon: Search, keywords: 'explore listings find' },
];

function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const actions = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
    const isAdmin = roles.some((role) => adminRoles.includes(role));
    const isLandlord = roles.includes('Landlord');
    const isStudent = roles.includes('Student') || (!isLandlord && !isAdmin);
    const inboxPath = activeRole === 'landlord' ? '/landlord/inbox' : '/profile/inbox';
    const next = [...baseActions];

    if (user) {
      next.push(
        { id: 'inbox', label: 'Inbox', hint: 'Messages and requests', path: inboxPath, Icon: Inbox, keywords: 'chat message conversation' },
        { id: 'profile', label: 'Profile', hint: 'Account details', path: activeRole === 'landlord' ? '/landlord/profile' : activeRole === 'admin' ? '/admin/profile' : '/profile', Icon: User, keywords: 'account kyc details' }
      );
    }

    if (isStudent) {
      next.push(
        { id: 'wishlist', label: 'Wishlist', hint: 'Saved rooms', path: '/profile/wishlist', Icon: Heart, keywords: 'saved favorite rooms' },
        { id: 'applications', label: 'My applications', hint: 'Booking status', path: '/profile/my-applications', Icon: ShieldCheck, keywords: 'booking approved confirmed' }
      );
    }

    if (isLandlord) {
      next.push(
        { id: 'landlord-overview', label: 'Landlord dashboard', hint: 'Host command center', path: '/landlord/overview', Icon: Gauge, keywords: 'host dashboard overview' },
        { id: 'add-room', label: 'Add new room', hint: 'Create listing', path: '/landlord/add-room', Icon: Plus, keywords: 'listing create property' },
        { id: 'my-rooms', label: 'My rooms', hint: 'Inventory', path: '/landlord/my-rooms', Icon: Home, keywords: 'listings properties inventory' },
        { id: 'landlord-applications', label: 'Applications', hint: 'Lead pipeline', path: '/landlord/applications', Icon: Users, keywords: 'booking requests leads' },
        { id: 'calendar', label: 'Booking calendar', hint: 'Availability', path: '/landlord/calendar', Icon: CalendarDays, keywords: 'dates gaps bookings' },
        { id: 'insights', label: 'Host insights', hint: 'Views and earnings', path: '/landlord/insights', Icon: BarChart3, keywords: 'analytics performance revenue' }
      );
    }

    if (isAdmin) {
      next.push(...adminNavigation.flatMap((section) => (
        section.items.filter((item) => canAccessAdminItem(user, item)).map((item) => ({
          id: `admin-${item.path}`,
          label: item.name,
          hint: section.section,
          path: item.path,
          Icon: item.icon,
          keywords: `admin ${section.section}`,
        }))
      )));
    }

    if (user) {
      const canOpenAdminTickets = isAdmin && hasAdminPermission(user, 'tickets:manage');
      const canOpenAdminSettings = isAdmin && hasAdminPermission(user, 'settings:manage');
      next.push(
        { id: 'support', label: 'Support tickets', hint: canOpenAdminTickets ? 'Admin queue' : 'Help center', path: canOpenAdminTickets ? '/admin/tickets' : inboxPath, Icon: LifeBuoy, keywords: 'help issue ticket' },
        { id: 'settings', label: canOpenAdminSettings ? 'Platform settings' : 'Account settings', hint: 'Preferences', path: canOpenAdminSettings ? '/admin/settings' : activeRole === 'landlord' ? '/landlord/profile' : '/profile', Icon: Settings, keywords: 'settings preferences' },
        {
          id: 'logout',
          label: 'Logout',
          hint: 'End session',
          Icon: LogOut,
          keywords: 'sign out exit',
          run: () => {
            logout();
            navigate('/login');
          },
        }
      );
    } else {
      next.push({ id: 'login', label: 'Login', hint: 'Continue to account', path: '/login', Icon: User, keywords: 'signin account' });
    }

    return next;
  }, [activeRole, logout, navigate, user]);

  const filteredActions = useMemo(() => {
    const term = normalize(query).trim();
    if (!term) return actions.slice(0, 9);
    return actions
      .filter((action) => normalize(`${action.label} ${action.hint} ${action.keywords}`).includes(term))
      .slice(0, 9);
  }, [actions, query]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isCommand = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isCommand) return;
      event.preventDefault();
      triggerHaptic('tap');
      setOpen((value) => !value);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => inputRef.current?.focus(), 40);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filteredActions.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const action = filteredActions[activeIndex];
        if (action) executeAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, filteredActions, open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const executeAction = (action) => {
    triggerHaptic(action.id === 'logout' ? 'warning' : 'tap');
    setOpen(false);
    if (action.run) {
      action.run();
      return;
    }
    if (action.path) navigate(action.path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/45 p-3 text-slate-950 backdrop-blur-sm dark:text-white sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto mt-[12vh] max-w-2xl overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/96 shadow-2xl dark:border-white/10 dark:bg-slate-900/96">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions, pages, rooms, admin tools"
            className="h-11 min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="mx-auto h-9 w-9 text-cyan-500" />
              <p className="mt-3 text-sm font-black">No matching action</p>
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const Icon = action.Icon || Search;
              const active = index === activeIndex;
              return (
                <button
                  key={action.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => executeAction(action)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    active ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${active ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{action.label}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold opacity-70">{action.hint}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
