import React from 'react';

const AppLoader = () => {
  return (
    <div
      className="app-loader-premium app-loader-native fixed inset-0 z-[99999]"
      role="status"
      aria-live="polite"
      aria-label="RoomRadar is loading"
    >
      <div className="app-loader-card app-loader-wordmark-card" aria-hidden="true">
        <div className="app-loader-logo app-loader-wordmark app-loader-wordmark-premium">
          <span className="app-loader-wordmark-text">
            <span>Room</span>
            <span>Radar</span>
          </span>
          <span className="app-loader-wordmark-scan" />
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
