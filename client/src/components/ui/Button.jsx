import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark',
  secondary: 'bg-light-bg text-light-text hover:bg-light-border dark:bg-dark-input dark:text-dark-text dark:hover:bg-dark-border',
  outline: 'border border-light-border bg-light-card text-light-text hover:bg-light-bg dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-input',
  ghost: 'text-light-muted hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-dark-text',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
};

const sizes = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

const Button = React.forwardRef(({ children, variant = 'primary', size = 'md', loading = false, className = '', disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={`rr-smooth-control inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    <span className={loading ? 'opacity-70' : ''}>{children}</span>
  </button>
));

Button.displayName = 'Button';

export default Button;
