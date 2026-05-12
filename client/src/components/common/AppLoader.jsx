import React from 'react';
import { Radar } from 'lucide-react';

const sidebarRows = Array.from({ length: 5 });
const previewCards = Array.from({ length: 4 });

const AppLoader = () => {
  return (
    <div
      className="app-loader-premium fixed inset-0 z-[99999]"
      role="status"
      aria-live="polite"
      aria-label="RoomRadar is loading"
    >
      <div className="app-loader-topbar" aria-hidden="true">
        <span />
      </div>

      <div className="app-loader-card" aria-hidden="true">
        <div className="app-loader-masthead">
          <div className="app-loader-logo">
            <span className="app-loader-pulse" />
            <Radar className="app-loader-logo-icon" />
          </div>
          <div className="app-loader-channel-lines">
            <span className="app-loader-line app-loader-line--lg" />
            <span className="app-loader-line app-loader-line--sm" />
          </div>
        </div>

        <div className="app-loader-screen">
          <div className="app-loader-sidebar">
            {sidebarRows.map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="app-loader-content">
            <div className="app-loader-hero" />
            <div className="app-loader-grid">
              {previewCards.map((_, index) => (
                <div className="app-loader-tile" key={index}>
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
