import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Moon, Search, Settings, Sun } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useTheme } from '../../../context/ThemeContext';
import { useUI } from '../../../context/UIContext';

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
  const { headerSearchTerm, setHeaderSearchTerm, activeChatMeta, chatProfileOpen, setChatProfileOpen } = useUI();
  const path = location.pathname;
  const isHome = path === '/';
  const isSearchPage = path === '/rooms';
  const isAdmin = path.startsWith('/admin');
  const isLandlord = path.startsWith('/landlord');
  const isInbox = /\/(?:profile|landlord)\/inbox(?:\/|$)/.test(path);
  const isChat = /\/(?:profile|landlord)\/inbox\/[^/]+/.test(path);
  const isOverlay = isHome;
  const isScrolled = true;
  const mode = isChat ? 'chat' : isInbox ? 'inbox' : isSearchPage ? 'search' : isHome ? 'home' : 'surface';
  const pageTitle = getPageTitle(path);
  const profileRole = isAdmin ? 'admin' : isLandlord ? 'landlord' : activeRole;
  const profile = getRoleProfile(user, profileRole);
  const chatName = activeChatMeta?.name || 'Chat';
  const chatSubtitle = activeChatMeta?.subtitle || (activeChatMeta?.isOnline ? 'Active now' : 'Recently active');
  const chatAvatar = activeChatMeta?.avatarUrl;
  const chatStatus = formatStatusLabel(activeChatMeta?.statusLabel || activeChatMeta?.typeLabel);
  const showBack = isChat || path.startsWith('/room/') || path.includes('/payment/') || path.includes('/agreement/') || path.includes('/report-damage/') || /\/admin\/(?:users|rooms)\/[^/]+/.test(path);
  const compactLogo = isScrolled || isInbox || isAdmin || isLandlord || (!isHome && !showBack);
  const showSearchPill = isSearchPage;
  const renderPortal = (node) => (typeof document === 'undefined' ? node : createPortal(node, document.body));

  const headerClass = [
    'smart-app-header',
    `smart-app-header--${mode}`,
    isOverlay ? 'smart-app-header--overlay' : 'smart-app-header--surface',
    isScrolled ? 'is-scrolled' : '',
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
      {isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
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
            <span className="smart-header-chat-avatar">
              {chatAvatar ? <img src={chatAvatar} alt={chatName} /> : getInitial(chatName)}
              <span className={`smart-header-online-dot ${activeChatMeta?.isOnline ? 'is-online' : ''}`} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[clamp(13px,3.6vw,15px)] font-black leading-tight">{chatName}</span>
              <span className="block truncate text-[clamp(10px,2.8vw,11px)] font-bold leading-tight text-slate-500 dark:text-slate-400">{chatSubtitle}</span>
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
          {isInbox ? (
            <label className="smart-header-search">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
              <input
                value={headerSearchTerm}
                onChange={(event) => setHeaderSearchTerm(event.target.value)}
                placeholder="Search chats"
              />
            </label>
          ) : showSearchPill ? (
            <button type="button" onClick={() => navigate('/rooms')} className="smart-header-search smart-header-search--button" aria-label="Open room search">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
              <span>{isHome ? 'Start search' : 'Search rooms'}</span>
            </button>
          ) : isHome && !isScrolled ? null : (
            <span className="smart-header-title">{isLandlord && path === '/landlord/overview' ? 'Hosting' : pageTitle}</span>
          )}
        </div>

        <div className="smart-header-right">
          {isAdmin && (
            <Link to="/admin/settings" className="smart-header-action smart-header-action--secondary" aria-label="Admin settings">
              <Settings className="h-[18px] w-[18px]" />
            </Link>
          )}
          {!isInbox && renderThemeButton()}
          {!isAdmin && !isInbox && (
            <Link to={isLandlord ? '/landlord/inbox' : '/profile/inbox'} className="smart-header-action smart-header-action--secondary" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
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
