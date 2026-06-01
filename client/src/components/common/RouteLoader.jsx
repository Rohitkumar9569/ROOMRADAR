import React from 'react';

function RouteLoader() {
  return (
    <div className="route-loader-shell route-loader-native" role="status" aria-live="polite" aria-label="Loading RoomRadar">
      <div className="route-loader-progress" aria-hidden="true">
        <span />
      </div>

      <div className="route-loader-card route-loader-wordmark-card" aria-hidden="true">
        <div className="route-loader-mark route-loader-wordmark route-loader-wordmark-premium">
          <span className="route-loader-wordmark-text">
            <span>Room</span>
            <span>Radar</span>
          </span>
          <span className="route-loader-wordmark-scan" />
        </div>
      </div>
    </div>
  );
}

export default RouteLoader;
