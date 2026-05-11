import React from 'react';
import { Radar } from 'lucide-react';

function RouteLoader() {
  return (
    <div className="route-loader-shell" role="status" aria-live="polite" aria-label="Loading RoomRadar">
      <div className="route-loader-card">
        <div className="route-loader-mark">
          <span />
          <Radar className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="route-loader-kicker">RoomRadar</p>
          <p className="route-loader-title">Preparing your view</p>
        </div>
      </div>

      <div className="route-loader-skeleton" aria-hidden="true">
        <div className="route-loader-line route-loader-line--wide" />
        <div className="route-loader-line" />
        <div className="route-loader-grid">
          <div />
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}

export default RouteLoader;
