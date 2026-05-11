import React from 'react';
import Button from './Button';

const EmptyState = ({ icon, title, description, actionLabel, onAction, className = '' }) => (
  <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card ${className}`}>
    {icon && <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">{icon}</div>}
    <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</h3>
    {description && <p className="mt-2 max-w-md text-base leading-relaxed text-light-muted dark:text-dark-muted">{description}</p>}
    {actionLabel && onAction && <Button type="button" onClick={onAction} className="mt-6">{actionLabel}</Button>}
  </div>
);

export default EmptyState;
