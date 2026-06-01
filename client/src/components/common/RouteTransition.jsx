import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';

const transition = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1],
};

function RouteTransition({ context, className = '', includeSearch = true }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const routeKey = includeSearch ? `${location.pathname}${location.search}` : location.pathname;

  if (reduceMotion) {
    return className ? (
      <div className={className}>
        <Outlet context={context} />
      </div>
    ) : (
      <Outlet context={context} />
    );
  }

  return (
    <motion.div
      key={routeKey}
      className={className}
      initial={{ opacity: 0.96, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      <Outlet context={context} />
    </motion.div>
  );
}

export default RouteTransition;
