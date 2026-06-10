import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'subtle';
  size?: 'sm' | 'default' | 'lg';
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-brand-600 text-white hover:bg-brand-700',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  subtle: 'bg-slate-100 text-slate-900 hover:bg-slate-200'
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  default: 'h-11 px-4 py-2',
  lg: 'h-12 px-6 text-base'
};

export function Button({ className = '', variant = 'default', size = 'default', ...props }: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
}
