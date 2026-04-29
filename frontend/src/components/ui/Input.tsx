import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const { colors } = useTheme();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn('text-xs font-medium uppercase tracking-wide', colors.input.label)}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            colors.input.bg,
            colors.input.text,
            colors.input.placeholder,
            error
              ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50'
              : colors.input.border,
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {helperText && !error && <p className={cn('text-xs', colors.input.helper)}>{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const { colors } = useTheme();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn('text-xs font-medium uppercase tracking-wide', colors.input.label)}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm resize-none',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            colors.input.bg,
            colors.input.text,
            colors.input.placeholder,
            error
              ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50'
              : colors.input.border,
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const { colors } = useTheme();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn('text-xs font-medium uppercase tracking-wide', colors.input.label)}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm',
            'transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            colors.input.bg,
            colors.input.text,
            error
              ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50'
              : colors.input.border,
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
