import React from 'react';

const Card = ({ children, className = '', hover = false, ...props }) => (
  <div
    className={`rr-smooth-card rounded-2xl border border-light-border bg-light-card shadow-sm transition-shadow dark:border-dark-border dark:bg-dark-card ${hover ? 'hover:shadow-md' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
