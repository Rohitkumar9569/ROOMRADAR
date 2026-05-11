import React from 'react';

const variants = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  confirmed: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  new: 'bg-brand/10 text-brand',
  verified: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  neutral: 'bg-light-bg text-light-muted dark:bg-dark-input dark:text-dark-muted',
};

const Badge = ({ children, variant = 'neutral', className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${variants[variant] || variants.neutral} ${className}`}>
    {children}
  </span>
);

export default Badge;
