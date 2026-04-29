import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';
import { useTheme, type ThemeColors } from '../../contexts/ThemeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

function getVariantClasses(variant: string, colors: ThemeColors) {
  const variants: Record<string, string> = {
    primary: `${colors.button.primary} border-transparent font-semibold`,
    secondary: `${colors.button.secondary} font-medium`,
    ghost: `${colors.button.ghost} font-medium`,
    danger: `${colors.button.danger} font-medium`,
    outline: `${colors.button.outline} font-medium`,
  };
  return variants[variant] || variants.primary;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const { colors } = useTheme();

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 border cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          colors.button.focusOffset,
          getVariantClasses(variant, colors),
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
    );
  }
);
Button.displayName = 'Button';
