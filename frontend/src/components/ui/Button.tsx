import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variants = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 border-transparent',
  secondary:
    'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600',
  ghost:
    'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-transparent',
  danger:
    'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-600/30',
  outline:
    'bg-transparent hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 border cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 focus:ring-offset-slate-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  )
);
Button.displayName = 'Button';
