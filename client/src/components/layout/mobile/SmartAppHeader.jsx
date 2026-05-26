import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Moon, Search, Settings, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useTheme } from '../../../context/ThemeContext';
import { useUI } from '../../../context/UIContext';
import { hasAdminPermission } from '../../../utils/adminPermissions';

const getInitial = (name = 'R') => name.charAt(0).toUpperCase();

const formatStatusLabel = (value = '') => String(value)
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .trim();

const getPageTitle = (path) => {
  if (path === '/') return 'RoomRadar';
  if (path === '/rooms') return 'Search';
  if (path.startsWith('/room/')) return 'Room';
  if (path.includes('/wishlist')) return 'Saved';
  if (path.includes('/my-applications')) return 'Trips';
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
    name: roleProfile?.name || user?.name || (normalizedRole === 'admin' ? 'Admin' : 'RoomRadar'),
    avatar: roleProfile?.avatarUrl || roleProfile?.profilePicture || user?.avatarUrl || user?.profilePicture,
  };
};

const SmartAppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
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
  const canOpenAdminSettings = isAdmin && hasAdminPermission(user, 'settings:manage');
  const isLandlord = path.startsWith('/landlord');
  const isInbox = /\/(?:profile|landlord)\/inbox(?:\/|$)/.test(path);
  const isChat = /\/(?:profile|landlord)\/inbox\/[^/]+/.test(path);
  const isOverlay = false;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavbarSearchFocused, setIsNavbarSearchFocused] = useState(false);
  const [navbarLocationDraft, setNavbarLocationDraft] = useState('');
  const navbarLocationInputRef = useRef(null);
  const mode = isChat ? 'chat' : isInbox ? 'inbox' : isSearchPage ? 'search' : isHome ? 'home' : 'surface';
  const keepNavbarSearchOpen = (isHome || isSearchPage) && isNavbarSearchFocused;
  const pageTitle = getPageTitle(path);
  const profileRole = isAdmin ? 'admin' : isLandlord ? 'landlord' : activeRole;
  const profile = getRoleProfile(user, profileRole);
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

  const renderAvatar = () => (
    <Link to={isLandlord ? '/landlord/profile' : isAdmin ? '/admin/profile' : '/profile'} className="smart-header-avatar" aria-label={isAdmin ? 'Open admin profile' : 'Open profile'}>
      {profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{getInitial(profile.name)}</span>}
    </Link>
  );

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

  const renderThemeButton = () => (
    <button type="button" onClick={toggleTheme} className="smart-header-action smart-header-action--theme" aria-label="Toggle theme">
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
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
                getInitial(chatName)
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
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
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
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
                  <span>Search rooms</span>
                </>
              )}
            </form>
          ) : isHome || isSearchPage ? null : (
            <span className="smart-header-title">{isLandlord && path === '/landlord/overview' ? 'Hosting' : pageTitle}</span>
          )}
        </div>

        <div className="smart-header-right">
          {canOpenAdminSettings && (
            <Link to="/admin/settings" className="smart-header-action smart-header-action--secondary" aria-label="Admin settings">
              <Settings className="h-5 w-5" />
            </Link>
          )}
          {!isInbox && renderThemeButton()}
          {!isAdmin && !isInbox && !isHome && !isSearchPage && (
            <Link to={isLandlord ? '/landlord/inbox' : '/profile/inbox'} className="smart-header-action smart-header-action--secondary" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && <span className="smart-header-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
            </Link>
          )}
          {renderAvatar()}
        </div>
      </div>
    </header>
  );
};

export default SmartAppHeader;
