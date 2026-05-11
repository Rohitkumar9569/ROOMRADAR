import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { prefetchRoute, warmRoutesWhenIdle } from '../../../utils/routePrefetch';

const getInitial = (name = 'R') => name.charAt(0).toUpperCase();

const getProfile = (user, activeRole) => {
  const normalizedRole = String(activeRole || '').toLowerCase();
  const profile = normalizedRole === 'landlord' ? user?.roleProfiles?.landlord : user?.roleProfiles?.student;

  return {
    name: profile?.name || user?.name || 'RoomRadar',
    avatar: profile?.avatarUrl || profile?.profilePicture || user?.avatarUrl || user?.profilePicture,
  };
};

const MobileBottomNav = ({ items, hidden = false, currentPath, className = '', variant = 'student' }) => {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
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

  const nav = (
    <nav className={`app-mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 w-full md:hidden ${className}`} aria-label="Primary mobile navigation">
      <div className={`rr-bottom-track rr-bottom-track--${variant}`} style={{ '--rr-active-index': activeIndex }}>
        <span className="rr-bottom-orb" aria-hidden="true" />
        {items.map((item) => {
          const Icon = item.Icon;
          const isProtected = Boolean(item.protected);
          const badge = Number(item.count || 0);
          const handlePrefetch = () => prefetchRoute(isProtected && !user ? '/login' : item.path);

          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              preventScrollReset
              onPointerEnter={handlePrefetch}
              onPointerDown={handlePrefetch}
              onTouchStart={handlePrefetch}
              onClick={(event) => {
                if (path === item.path) {
                  event.preventDefault();
                  return;
                }
                if (isProtected && !user) {
                  event.preventDefault();
                  navigate('/login', { state: { from: item.path } });
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
                    {active && !item.center && (
                      <span
                        className="rr-bottom-active-pill"
                        aria-hidden="true"
                      />
                    )}
                    {item.center ? (
                      <span className={`rr-bottom-fab ${active ? 'is-active' : ''}`}>
                        <Icon className="h-[22px] w-[22px]" strokeWidth={2.65} />
                      </span>
                    ) : (
                      <span className={`rr-bottom-icon ${active ? 'is-active' : ''}`}>
                        {item.avatar ? (
                          <span className={`rr-bottom-avatar ${active ? 'is-active' : ''}`}>
                            {profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{getInitial(profile.name)}</span>}
                          </span>
                        ) : (
                          <Icon
                            size={21}
                            strokeWidth={active ? 2.55 : 2.05}
                          />
                        )}
                        {badge > 0 && (
                          <span className="rr-bottom-badge">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                        {active && <span className="rr-bottom-active-sheen" />}
                      </span>
                    )}
                    <span className={`rr-bottom-label ${active ? 'is-active' : ''} ${item.center ? 'is-center' : ''}`}>
                      {item.label}
                    </span>
                    {active && !item.center && (
                      <span className="rr-bottom-active-dot" aria-hidden="true" />
                    )}
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
