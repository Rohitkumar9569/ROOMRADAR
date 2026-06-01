import React from 'react';

const routeTiles = Array.from({ length: 3 });

function RouteLoader() {
  return (
    <div className="route-loader-shell route-loader-native" role="status" aria-live="polite" aria-label="Loading RoomRadar">
      <div className="route-loader-progress" aria-hidden="true">
        <span />
      </div>

      <div className="route-loader-card" aria-hidden="true">
        <div className="route-loader-mark route-loader-wordmark">
          <span className="route-loader-wordmark-text">
            <span>Room</span>
            <span>Radar</span>
          </span>
          <span className="route-loader-wordmark-scan" />
        </div>
        <div className="route-loader-lines">
          <span className="route-loader-line route-loader-line--wide" />
          <span className="route-loader-line" />
        </div>
      </div>

      <div className="route-loader-skeleton" aria-hidden="true">
        <div className="route-loader-line route-loader-line--wide" />
        <div className="route-loader-line" />
        <div className="route-loader-grid">
          {routeTiles.map((_, index) => (
            <div key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default RouteLoader;
