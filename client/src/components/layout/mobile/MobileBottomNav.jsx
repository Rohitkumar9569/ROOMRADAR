import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getAvatarColorStyle, getAvatarInitial } from '../../../utils/avatar';
import { prefetchRoute, warmRoutesWhenIdle } from '../../../utils/routePrefetch';

const getProfilePhoto = (...values) => (
  values.find((value) => typeof value === 'string' && value.trim()) || ''
).trim();

const getProfile = (user, activeRole) => {
  const normalizedRole = String(activeRole || '').toLowerCase();
  const profile = normalizedRole === 'landlord' ? user?.roleProfiles?.landlord : user?.roleProfiles?.student;

  return {
    name: profile?.name || user?.name || user?.email || 'RoomRadar',
    avatar: getProfilePhoto(
      profile?.avatarUrl,
      profile?.profilePicture,
      profile?.photoUrl,
      profile?.photoURL,
      profile?.picture,
      profile?.imageUrl,
      user?.avatarUrl,
      user?.profilePicture,
      user?.photoUrl,
      user?.photoURL,
      user?.picture,
      user?.imageUrl,
    ),
  };
};

const MobileBottomNav = ({ items, hidden = false, currentPath, className = '', variant = 'student' }) => {
  const { user, activeRole } = useAuth();
  const location = useLocation();
  const path = currentPath || location.pathname;
  const profileRole = variant === 'landlord' || path.startsWith('/landlord') ? 'landlord' : activeRole;
  const profile = getProfile(user, profileRole);
  const prefetchKey = items.map((item) => (item.protected && !user ? '/login' : item.path)).join('|');

  useEffect(() => {
    if (hidden) return undefined;

    const paths = prefetchKey.split('|').filter(Boolean);
    return warmRoutesWhenIdle(paths);
  }, [hidden, prefetchKey]);

  if (hidden) return null;

  const getActiveState = (item) => {
    if (item.end) return path === item.path;
    if (item.activePrefixes?.some((prefix) => path.startsWith(prefix))) return true;
    return path === item.path || path.startsWith(`${item.path}/`);
  };

  const activeIndex = Math.max(0, items.findIndex(getActiveState));
  const getBadgeClassName = (item) => {
    const isMessageBadge = item.badgeKind === 'messages'
      || String(item.path || '').includes('/inbox')
      || String(item.label || '').toLowerCase() === 'inbox';
    return `rr-bottom-badge ${isMessageBadge ? 'rr-message-count-badge' : ''}`.trim();
  };

  const nav = (
    <nav className={`app-mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 w-full md:hidden ${className}`} aria-label="Primary mobile navigation">
      <div className={`rr-bottom-track rr-bottom-track--${variant}`} style={{ '--rr-active-index': activeIndex }}>
        {items.map((item) => {
          const Icon = item.Icon;
          const isProtected = Boolean(item.protected);
          const targetPath = isProtected && !user ? '/login' : item.path;
          const targetState = isProtected && !user ? { from: { pathname: item.path } } : undefined;
          const badge = Number(item.count || 0);
          const handlePrefetch = () => prefetchRoute(targetPath);

          return (
            <NavLink
              key={item.label}
              to={targetPath}
              state={targetState}
              end={item.end}
              preventScrollReset
              onPointerEnter={handlePrefetch}
              onPointerDown={handlePrefetch}
              onTouchStart={handlePrefetch}
              onClick={(event) => {
                if (path === targetPath) {
                  event.preventDefault();
                }
              }}
              className={`rr-bottom-item ${item.center ? 'rr-bottom-item--center' : ''}`}
              aria-label={item.ariaLabel || item.label}
            >
              {({ isActive }) => {
                const active = isActive || getActiveState(item);
                return (
                  <div
                    className="rr-bottom-item-inner"
                  >
                    {item.center ? (
                      <span className={`rr-bottom-fab ${active ? 'is-active' : ''}`}>
                        <Icon className="h-6 w-6" strokeWidth={active ? 2.7 : 2.25} fill="none" />
                      </span>
                    ) : (
                      <span className={`rr-bottom-icon ${active ? 'is-active' : ''}`}>
                        {item.avatar ? (
                          <span className={`rr-bottom-avatar ${active ? 'is-active' : ''}`}>
                            {profile.avatar ? (
                              <img src={profile.avatar} alt={profile.name} />
                            ) : user ? (
                              <span className="rr-avatar-initial" style={getAvatarColorStyle(user.id || user._id || user.email, profile.name)} aria-hidden="true">
                                {getAvatarInitial(profile.name, user.email)}
                              </span>
                            ) : (
                              <UserRound className="rr-avatar-fallback-icon" aria-hidden="true" />
                            )}
                          </span>
                        ) : (
                          <Icon
                            size={25}
                            strokeWidth={active ? 2.65 : 2.12}
                            fill="none"
                          />
                        )}
                        {badge > 0 && (
                          <span className={getBadgeClassName(item)} aria-label={`${badge} unread messages`}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </span>
                    )}
                    <span className={`rr-bottom-label ${active ? 'is-active' : ''} ${item.center ? 'is-center' : ''}`}>
                      {item.label}
                    </span>
                  </div>
                );
              }}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  return typeof document === 'undefined' ? nav : createPortal(nav, document.body);
};

export default MobileBottomNav;
