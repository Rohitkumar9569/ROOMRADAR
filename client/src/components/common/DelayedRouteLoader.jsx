import React, { useEffect, useState } from 'react';
import RouteLoader from './RouteLoader';

function DelayedRouteLoader({ delay = 160 }) {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return showLoader ? <RouteLoader /> : null;
}

export default DelayedRouteLoader;
