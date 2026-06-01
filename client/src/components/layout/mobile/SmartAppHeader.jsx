import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  ChevronLeft,
  CircleHelp,
  Heart,
  Home,
  List,
  LogOut,
  MessageCircle,
  Moon,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useTheme } from '../../../context/ThemeContext';
import { useUI } from '../../../context/UIContext';
import { getAvatarColorStyle, getAvatarInitial } from '../../../utils/avatar';
import { hasAdminPermission } from '../../../utils/adminPermissions';
import { triggerHaptic } from '../../../utils/haptics';
import { switchRoleSmoothly } from '../../../utils/roleSwitch';

const ADMIN_ROLES = ['Admin', 'Super_Admin', 'Moderator', 'Support'];

const formatStatusLabel = (value = '') => String(value)
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .trim();

const getPageTitle = (path) => {
  if (path === '/') return 'RoomRadar';
  if (path === '/rooms') return 'Search';
  if (path.startsWith('/room/')) return 'Room';
  if (path.includes('/wishlist')) return 'Saved';
  if (path.includes('/my-applications')) return 'Requests';
  if (path.includes('/profile') && !path.includes('/inbox')) return 'Profile';
  if (path.includes('/landlord/overview')) return 'Dashboard';
  if (path.includes('/landlord/my-rooms')) return 'Listings';
  if (path.includes('/landlord/add-room')) return 'Add Room';
  if (path.includes('/landlord/profile')) return 'Me';
  if (path.includes('/admin/analytics')) return 'Reports';
  if (path.includes('/admin/users')) return 'Users';
  if (path.includes('/admin/rooms')) return 'Rooms';
  if (path.includes('/admin/settings')) return 'Settings';
  if (path.includes('/admin')) return 'Admin Center';
  if (path.includes('/inbox')) return 'Inbox';
  return 'RoomRadar';
};

const getRoleProfile = (user, activeRole) => {
  const normalizedRole = String(activeRole || '').toLowerCase();
  const roleProfile = normalizedRole === 'admin'
    ? (user?.roleProfiles?.admin || user?.adminProfile)
    : normalizedRole === 'landlord'
      ? user?.roleProfiles?.landlord
      : user?.roleProfiles?.student;
  return {
    name: roleProfile?.name || user?.name || user?.email || (normalizedRole === 'admin' ? 'Admin' : 'RoomRadar'),
    avatar: roleProfile?.avatarUrl || roleProfile?.profilePicture || user?.avatarUrl || user?.profilePicture,
  };
};

const SmartAppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, logout, switchRole } = useAuth();
  const { unreadNotificationCount = 0 } = useSocket() || {};
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    headerSearchTerm,
    setHeaderSearchTerm,
    activeChatMeta,
    chatProfileOpen,
    setChatProfileOpen,
    inboxListScrolled,
  } = useUI();
  const path = location.pathname;
  const isHome = path === '/';
  const isSearchPage = path === '/rooms';
  const isAdmin = path.startsWith('/admin');
  const isLandlord = path.startsWith('/landlord');
  const isInbox = /\/(?:profile|landlord)\/inbox(?:\/|$)/.test(path);
  const isChat = /\/(?:profile|landlord)\/inbox\/[^/]+/.test(path);
  const isOverlay = false;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavbarSearchFocused, setIsNavbarSearchFocused] = useState(false);
  const [navbarLocationDraft, setNavbarLocationDraft] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const navbarLocationInputRef = useRef(null);
  const mode = isChat ? 'chat' : isInbox ? 'inbox' : isSearchPage ? 'search' : isHome ? 'home' : 'surface';
  const keepNavbarSearchOpen = (isHome || isSearchPage) && isNavbarSearchFocused;
  const pageTitle = getPageTitle(path);
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const hasAdminRole = roles.some((role) => ADMIN_ROLES.includes(role));
  const hasLandlordRole = roles.includes('Landlord');
  const profileRole = isAdmin ? 'admin' : isLandlord ? 'landlord' : activeRole;
  const profile = getRoleProfile(user, profileRole);
  const displayName = profile.name || user?.name || user?.email || 'RoomRadar';
  const profilePath = isLandlord ? '/landlord/profile' : isAdmin ? '/admin/profile' : '/profile';
  const inboxPath = isLandlord ? '/landlord/inbox' : '/profile/inbox';
  const chatName = activeChatMeta?.name || 'Chat';
  const chatSubtitle = activeChatMeta?.subtitle || (activeChatMeta?.isOnline ? 'Active now' : 'Recently active');
  const chatAvatar = activeChatMeta?.avatarUrl;
  const isAdminChat = Boolean(activeChatMeta?.isAdmin);
  const rawChatStatus = formatStatusLabel(activeChatMeta?.statusLabel || activeChatMeta?.typeLabel);
  const chatStatus = rawChatStatus.toLowerCase() === 'admin update' ? 'Admin' : rawChatStatus;
  const showBack = isChat || path.startsWith('/room/') || path.includes('/payment/') || path.includes('/agreement/') || path.includes('/report-damage/') || /\/admin\/(?:users|rooms)\/[^/]+/.test(path);
  const inboxHeaderSearchActive = isInbox && !isChat && inboxListScrolled;
  const headerSearchActive = isChat || isScrolled || keepNavbarSearchOpen || inboxHeaderSearchActive;
  const keepRoleChromeCompact = isAdmin;
  const compactLogo = keepRoleChromeCompact || ((isHome || isSearchPage) && headerSearchActive) || (!isHome && !isSearchPage && !showBack && headerSearchActive);
  const showSearchPill = (isHome || isSearchPage) && headerSearchActive;
  const renderPortal = (node) => (typeof document === 'undefined' ? node : createPortal(node, document.body));

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!moreOpen || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  const handleSearchPillClick = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!isHome && !isSearchPage) {
      navigate('/rooms');
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
    const targetInputId = isSearchPage
      ? (isMobileViewport ? 'rooms-mobile-location-search' : 'rooms-location-search')
      : 'home-mobile-location-search';
    const shouldUseDock = isHome || (isSearchPage && isMobileViewport);

    const openLocationSearch = () => {
      window.dispatchEvent(new CustomEvent('roomradar:open-location-search', {
        detail: {
          inputId: targetInputId,
          forceDockOpen: shouldUseDock,
          scrollIntoView: isSearchPage && !isMobileViewport,
        },
      }));
      document.getElementById(targetInputId)?.focus();
    };

    if (isSearchPage && !isMobileViewport) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    openLocationSearch();
    window.requestAnimationFrame(openLocationSearch);
    window.setTimeout(openLocationSearch, isSearchPage ? 260 : 120);
  };

  const handleNavbarLocationSubmit = (event) => {
    event.preventDefault();
    const query = navbarLocationDraft.trim();

    if (!query) {
      handleSearchPillClick(event);
      return;
    }

    if (isSearchPage && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('roomradar:navbar-location-submit', {
        detail: { locationQuery: query },
      }));
      return;
    }

    navigate(`/rooms?city=${encodeURIComponent(query)}`);
  };

  const focusNavbarLocationInput = (event) => {
    if (event.target.closest('button')) return;
    navbarLocationInputRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!isSearchPage) {
      if (!isHome) setNavbarLocationDraft('');
      return;
    }

    const params = new URLSearchParams(location.search);
    setNavbarLocationDraft(params.get('city') || params.get('search') || '');
  }, [isHome, isSearchPage, location.search]);

  useEffect(() => {
    if (isChat) {
      setIsScrolled(true);
      return undefined;
    }

    const threshold = isSearchPage ? 64 : isHome ? 96 : 10;
    const updateHeaderVisibility = () => setIsScrolled(window.scrollY > threshold);

    updateHeaderVisibility();
    window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateHeaderVisibility);
  }, [isChat, isHome, isSearchPage, path]);

  const headerClass = [
    'smart-app-header',
    `smart-app-header--${mode}`,
    isOverlay ? 'smart-app-header--overlay' : 'smart-app-header--surface',
    headerSearchActive ? 'is-scrolled' : '',
    compactLogo ? 'is-compact' : '',
    isChat ? 'smart-app-header--chat' : '',
  ].filter(Boolean).join(' ');

  const renderInitialAvatar = (name, className = 'rr-avatar-initial', seed = user?.id || user?._id || user?.email) => (
    <span className={className} style={getAvatarColorStyle(seed || name, name)} aria-hidden="true">
      {getAvatarInitial(name, seed)}
    </span>
  );

  const renderProfileAvatar = (className = 'smart-header-avatar') => (
    <span className={`${className} ${profile.avatar ? 'has-photo' : 'has-initial'}`} aria-hidden="true">
      {profile.avatar ? <img src={profile.avatar} alt="" /> : renderInitialAvatar(displayName)}
    </span>
  );

  const supportPath = hasAdminRole && hasAdminPermission(user, 'tickets:manage') ? '/admin/tickets' : inboxPath;
  const settingsPath = isAdmin && hasAdminPermission(user, 'settings:manage') ? '/admin/settings' : profilePath;

  const accountActions = user ? [
    { id: 'profile', label: 'Profile', hint: 'Account and verification', path: profilePath, Icon: UserRound },
    { id: 'inbox', label: 'Inbox', hint: unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'Messages', path: inboxPath, Icon: MessageCircle, badge: unreadNotificationCount },
    { id: 'settings', label: isAdmin ? 'Settings' : 'Account', hint: 'Preferences', path: settingsPath, Icon: Settings },
    {
      id: 'theme',
      label: isDarkMode ? 'Light mode' : 'Dark mode',
      hint: 'App appearance',
      Icon: isDarkMode ? Sun : Moon,
      run: toggleTheme,
    },
  ] : [
    { id: 'login', label: 'Log in', hint: 'Continue to RoomRadar', path: '/login', Icon: UserRound },
    { id: 'rooms', label: 'Search rooms', hint: 'Find verified stays', path: '/rooms', Icon: Search },
  ];

  const rentalActions = isLandlord ? [
    { id: 'host-home', label: 'Hosting', hint: 'Today dashboard', path: '/landlord/overview', Icon: Home },
    { id: 'listings', label: 'Listings', hint: 'Manage rooms', path: '/landlord/my-rooms', Icon: List },
    { id: 'add-room', label: 'Add room', hint: 'Create listing', path: '/landlord/add-room', Icon: PlusCircle },
    { id: 'host-requests', label: 'Requests', hint: 'Booking queue', path: '/landlord/applications', Icon: CalendarCheck },
  ] : [
    { id: 'search', label: 'Search rooms', hint: 'Map and filters', path: '/rooms', Icon: Search },
    { id: 'saved', label: 'Saved rooms', hint: 'Wishlist', path: '/profile/wishlist', Icon: Heart },
    { id: 'requests', label: 'Requests', hint: 'Booking status', path: '/profile/my-applications', Icon: CalendarCheck },
  ];

  const roleActions = [
    hasLandlordRole && !isLandlord ? {
      id: 'switch-hosting',
      label: 'Switch to hosting',
      hint: 'Manage listed rooms',
      Icon: Building2,
      run: () => switchRoleSmoothly({ role: 'landlord', path: '/landlord/overview', switchRole, navigate }),
    } : null,
    isLandlord ? {
      id: 'switch-search',
      label: 'Search rooms',
      hint: 'Room seeker mode',
      Icon: Search,
      run: () => switchRoleSmoothly({ role: 'student', path: '/', switchRole, navigate }),
    } : null,
    hasAdminRole && !isAdmin ? {
      id: 'admin-center',
      label: 'Admin center',
      hint: 'RoomRadar operations',
      path: '/admin/dashboard',
      Icon: ShieldCheck,
    } : null,
  ].filter(Boolean);

  const helpActions = user ? [
    { id: 'support', label: hasAdminRole && isAdmin ? 'Support desk' : 'Contact support', hint: 'Safety and account help', path: supportPath, Icon: CircleHelp },
    {
      id: 'logout',
      label: 'Log out',
      hint: 'End session',
      Icon: LogOut,
      danger: true,
      run: () => {
        logout();
        navigate('/login');
      },
    },
  ] : [
    { id: 'support', label: 'Help', hint: 'Sign in for support', path: '/login', Icon: CircleHelp },
  ];

  const moreSections = [
    { id: 'account', title: 'Account', actions: accountActions },
    { id: 'rental', title: isLandlord ? 'Hosting' : 'Rentals', actions: rentalActions },
    ...(roleActions.length ? [{ id: 'role', title: 'Mode', actions: roleActions }] : []),
    { id: 'help', title: 'More', actions: helpActions },
  ];

  const isActionActive = (action) => {
    if (!action.path) return false;
    if (action.path === '/') return path === '/';
    return path === action.path || path.startsWith(`${action.path}/`);
  };

  const runMoreAction = (action) => {
    triggerHaptic(action.danger ? 'warning' : 'tap');
    setMoreOpen(false);
    if (action.run) {
      action.run();
      return;
    }
    if (action.path) navigate(action.path);
  };

  const renderMoreButton = () => (
    <button
      type="button"
      onClick={() => {
        triggerHaptic('tap');
        setMoreOpen((value) => !value);
      }}
      className={`smart-header-action smart-header-action--more ${moreOpen ? 'is-active' : ''}`}
      aria-label={user ? 'Open account menu' : 'Open menu'}
      aria-expanded={moreOpen}
      aria-controls="rr-mobile-more-sheet"
    >
      {user ? renderProfileAvatar('smart-header-more-avatar') : <UserRound className="h-5 w-5" strokeWidth={2.35} />}
      {unreadNotificationCount > 0 && <span className="smart-header-badge smart-header-badge--menu rr-message-count-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
    </button>
  );

  const renderMoreSheet = () => {
    if (!moreOpen) return null;

    return (
      <div className="rr-mobile-more-overlay md:hidden" role="presentation" onClick={() => setMoreOpen(false)}>
        <div id="rr-mobile-more-sheet" className="rr-mobile-more-sheet" role="dialog" aria-modal="true" aria-label="RoomRadar menu" onClick={(event) => event.stopPropagation()}>
          <div className="rr-mobile-more-handle" aria-hidden="true" />
          <div className="rr-mobile-more-head">
            <div className="rr-mobile-more-identity">
              {renderProfileAvatar('rr-mobile-more-avatar')}
              <span className="min-w-0">
                <span className="rr-mobile-more-name">{displayName}</span>
                <span className="rr-mobile-more-subtitle">{user ? (isLandlord ? 'Hosting account' : isAdmin ? 'Admin account' : 'Room seeker account') : 'Guest mode'}</span>
              </span>
            </div>
            <button type="button" className="rr-mobile-more-close" onClick={() => setMoreOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rr-mobile-more-scroll">
            {moreSections.map((section) => (
              <section className="rr-mobile-more-section" key={section.id}>
                <p className="rr-mobile-more-section-title">{section.title}</p>
                <div className="rr-mobile-more-actions">
                  {section.actions.map((action) => {
                    const Icon = action.Icon || CircleHelp;
                    const active = isActionActive(action);
                    const badge = Number(action.badge || 0);
                    return (
                      <button
                        type="button"
                        key={action.id}
                        className={`rr-mobile-more-action ${active ? 'is-active' : ''} ${action.danger ? 'is-danger' : ''}`}
                        onClick={() => runMoreAction(action)}
                      >
                        <span className="rr-mobile-more-action-icon">
                          <Icon className="h-4 w-4" />
                          {badge > 0 && <span className="rr-mobile-more-dot rr-message-count-badge">{badge > 99 ? '99+' : badge}</span>}
                        </span>
                        <span className="rr-mobile-more-action-copy">
                          <span>{action.label}</span>
                          <small>{action.hint}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLogo = () => (
    <Link to={isLandlord ? '/landlord/overview' : isAdmin ? '/admin/dashboard' : '/'} className="smart-header-brand" aria-label="RoomRadar home">
      <span className="smart-header-logo-stack">
        <span className="smart-header-logo-compact">
          <span>R</span><span>R</span>
        </span>
        <span className="smart-header-logo-full">
          <span>Room</span><span>Radar</span>
        </span>
      </span>
    </Link>
  );

  if (isChat) {
    return renderPortal(
      <header className={`${headerClass} md:hidden`}>
        <div className="smart-header-inner">
          <button
            type="button"
            onClick={() => {
              if (chatProfileOpen) {
                setChatProfileOpen(false);
                return;
              }
              navigate(isLandlord ? '/landlord/inbox' : '/profile/inbox');
            }}
            className="smart-header-action"
            aria-label={chatProfileOpen ? 'Close chat profile' : 'Back to inbox'}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <button type="button" onClick={() => setChatProfileOpen(true)} className="smart-header-chat-profile" aria-label="Open chat profile">
            <span className={`smart-header-chat-avatar ${isAdminChat ? 'is-admin' : ''}`}>
              {isAdminChat ? (
                <span className="smart-header-admin-core" aria-hidden="true">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.35} />
                </span>
              ) : chatAvatar ? (
                <img src={chatAvatar} alt={chatName} />
              ) : (
                renderInitialAvatar(chatName, 'rr-avatar-initial', activeChatMeta?.id || activeChatMeta?.email || chatName)
              )}
              <span className={`smart-header-online-dot ${isAdminChat ? 'is-admin' : activeChatMeta?.isOnline ? 'is-online' : ''}`} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[clamp(15.5px,4.35vw,17.5px)] font-black leading-tight">{chatName}</span>
              <span className="block truncate text-[clamp(12.4px,3.48vw,14px)] font-extrabold leading-tight text-slate-500 dark:text-slate-400">{chatSubtitle}</span>
            </span>
          </button>
          {chatStatus && (
            <span className="smart-header-chat-status" title={chatStatus}>
              {chatStatus}
            </span>
          )}
        </div>
      </header>
    );
  }

  return renderPortal(
    <>
      <header className={`${headerClass} md:hidden`}>
        <div className="smart-header-inner">
          <div className="smart-header-left">
            {showBack ? (
              <button type="button" onClick={() => navigate(-1)} className="smart-header-action" aria-label="Go back">
                <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
              </button>
            ) : renderLogo()}
          </div>

          <div className="smart-header-center">
            {isInbox && inboxHeaderSearchActive ? (
              <label className="smart-header-search">
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-[#1a73e8]" />
                <input
                  value={headerSearchTerm}
                  onChange={(event) => setHeaderSearchTerm(event.target.value)}
                  placeholder="Search chats"
                />
              </label>
            ) : showSearchPill ? (
              <form
                onSubmit={handleNavbarLocationSubmit}
                onClick={focusNavbarLocationInput}
                className={`smart-header-search smart-header-search--inline ${(isHome || isSearchPage) ? 'smart-header-search--home-scroll' : ''}`}
                aria-label={isHome ? 'Search by location' : 'Search rooms by location'}
                role="search"
              >
                {(isHome || isSearchPage) ? (
                  <>
                    <input
                      ref={navbarLocationInputRef}
                      type="search"
                      value={navbarLocationDraft}
                      onChange={(event) => setNavbarLocationDraft(event.target.value)}
                      onFocus={() => setIsNavbarSearchFocused(true)}
                      onBlur={() => window.setTimeout(() => setIsNavbarSearchFocused(false), 120)}
                      placeholder="Search city or area"
                      aria-label="Search address, area, city, or campus"
                      autoComplete="street-address"
                      enterKeyHint="search"
                      spellCheck="false"
                    />
                    <button type="submit" className="smart-header-search-submit" aria-label="Search rooms">
                      <Search className="h-5 w-5" strokeWidth={2.4} />
                    </button>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-[#1a73e8]" />
                    <span>Search rooms</span>
                  </>
                )}
              </form>
            ) : isHome || isSearchPage ? null : (
              <span className="smart-header-title">{isLandlord && path === '/landlord/overview' ? 'Hosting' : pageTitle}</span>
            )}
          </div>

          <div className="smart-header-right">
            {renderMoreButton()}
          </div>
        </div>
      </header>
      {renderMoreSheet()}
    </>
  );
};

export default SmartAppHeader;
