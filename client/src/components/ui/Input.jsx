import React from 'react';

const Input = React.forwardRef(({ label, error, success, icon: Icon, className = '', ...props }, ref) => (
  <label className="block">
    {label && <span className="mb-2 block text-sm font-semibold text-light-text dark:text-dark-text">{label}</span>}
    <span className="relative block">
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-light-muted dark:text-dark-muted" />}
      <input
        ref={ref}
        className={`w-full rounded-xl border bg-light-card px-4 py-3 text-light-text shadow-sm outline-none transition focus:ring-2 focus:ring-brand/30 dark:bg-dark-input dark:text-dark-text ${Icon ? 'pl-12' : ''} ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : success ? 'border-green-400' : 'border-light-border dark:border-dark-border'} ${className}`}
        {...props}
      />
    </span>
    {error && <span className="mt-1 block text-xs font-semibold text-red-500">{error}</span>}
  </label>
));

Input.displayName = 'Input';

export default Input;
