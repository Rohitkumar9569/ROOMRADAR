import React from 'react';
import { Radar } from 'lucide-react';

function Spinner({ label = 'Loading' }) {
  return (
    <div className="rr-inline-loader flex items-center justify-center py-16" role="status" aria-live="polite" aria-label={label}>
      <div className="rr-inline-loader-card" aria-hidden="true">
        <span className="rr-inline-loader-icon">
          <Radar className="rr-inline-loader-logo-icon" />
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
