import React from 'react';

function Spinner({ label = 'Loading' }) {
  return (
    <div className="rr-inline-loader rr-inline-loader-native flex items-center justify-center py-16" role="status" aria-live="polite" aria-label={label}>
      <div className="rr-inline-loader-card" aria-hidden="true">
        <span className="rr-inline-loader-icon rr-inline-loader-wordmark">
          <span>
            <span>Room</span>
            <span>Radar</span>
          </span>
        </span>
        <span className="rr-inline-loader-lines">
          <span />
          <span />
        </span>
        <span className="rr-inline-loader-bar" />
      </div>
    </div>
  );
}

export default Spinner;
