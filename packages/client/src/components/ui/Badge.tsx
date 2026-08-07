import React from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'danger' | 'gold';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const map: Record<BadgeVariant, { wrap: string; dot: string }> = {
  default: {
    wrap: 'bg-bg-elevated border border-border-subtle text-secondary',
    dot: 'bg-secondary',
  },
  accent: {
    wrap: 'bg-white/10 border border-white/20 text-white',
    dot: 'bg-white',
  },
  success: {
    wrap: 'bg-success-dim border border-success/20 text-success',
    dot: 'bg-success',
  },
  danger: {
    wrap: 'bg-danger-dim border border-danger/20 text-danger',
    dot: 'bg-danger',
  },
  gold: {
    wrap: 'bg-gold-dim border border-gold/20 text-gold',
    dot: 'bg-gold',
  },
};

export function Badge({ children, variant = 'default', dot = false, pulse = false, className = '' }: BadgeProps) {
  const v = map[variant];
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      v.wrap, className,
    ].filter(Boolean).join(' ')}>
      {dot && (
        <span className={[
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          v.dot,
          pulse ? 'animate-pulse-slow' : '',
        ].join(' ')} />
      )}
      {children}
    </span>
  );
}
