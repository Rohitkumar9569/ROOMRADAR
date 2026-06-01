import React from 'react';

const listingCards = Array.from({ length: 3 });

const AppLoader = () => {
  return (
    <div
      className="app-loader-premium app-loader-native fixed inset-0 z-[99999]"
      role="status"
      aria-live="polite"
      aria-label="RoomRadar is loading"
    >
      <div className="app-loader-topbar" aria-hidden="true">
        <span />
      </div>

      <div
        className="app-loader-card"
        aria-hidden="true"
        style={{
          width: 'min(calc(100vw - 2.5rem), 22rem)',
          maxWidth: 'calc(100vw - 2.5rem)',
        }}
      >
        <div className="app-loader-masthead">
          <div className="app-loader-logo app-loader-wordmark">
            <span className="app-loader-wordmark-text">
              <span>Room</span>
              <span>Radar</span>
            </span>
            <span className="app-loader-wordmark-scan" />
          </div>
          <div className="app-loader-brand-copy">
            <span className="app-loader-brand-name">RoomRadar</span>
            <span className="app-loader-kicker">Opening verified rooms</span>
          </div>
        </div>

        <div className="app-loader-search-row">
          <span className="app-loader-search-dot" />
          <span className="app-loader-search-line" />
          <span className="app-loader-search-action" />
        </div>

        <div className="app-loader-list">
          {listingCards.map((_, index) => (
            <article className="app-loader-listing" key={index}>
              <span className="app-loader-media" />
              <span className="app-loader-meta">
                <span className="app-loader-meta-line app-loader-meta-line--title" />
                <span className="app-loader-meta-line" />
                <span className="app-loader-meta-line app-loader-meta-line--price" />
              </span>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
