import React from 'react';
import { Radar } from 'lucide-react';

const AppLoader = () => {
  return (
    <div
      className="app-loader-premium fixed inset-0 z-[99999] flex flex-col items-center justify-center text-light-text dark:text-dark-text"
    >
      <div className="app-loader-card">
        <div className="app-loader-logo">
          <span className="app-loader-pulse" />
          <Radar className="h-9 w-9" />
        </div>
        <div className="min-w-0">
          <p className="app-loader-kicker">
            RoomRadar
          </p>
          <h1 className="app-loader-title">
            Loading your stay flow
          </h1>
        </div>
      </div>

      <div className="app-loader-progress">
        <div className="h-full" />
      </div>
    </div>
  );
};

export default AppLoader;
