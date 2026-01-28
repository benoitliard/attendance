'use client';

import { clsx } from 'clsx';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={clsx(
        'glass-button flex items-center justify-center gap-2',
        {
          'glass-button-primary': variant === 'primary',
          'bg-red-500 text-white border-red-400/30 hover:bg-red-600': variant === 'danger',
          'bg-emerald-500 text-white border-emerald-400/30 hover:bg-emerald-600': variant === 'success',
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-3': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
          'opacity-50 cursor-not-allowed': disabled || loading,
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
