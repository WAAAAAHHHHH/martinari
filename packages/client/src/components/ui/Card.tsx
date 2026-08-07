import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'flat';
}

const paddingMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-7' };

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
  variant = 'default',
}: CardProps) {
  const variantClass = {
    default: 'bg-bg-card border-border backdrop-blur-xl shadow-glass hover:shadow-glass-hover',
    accent: 'bg-white/5 border border-border-strong',
    flat: 'bg-bg-elevated border-border',
  }[variant];

  const base = [
    variantClass,
    paddingMap[padding],
    hover || onClick ? 'card-hover cursor-pointer' : '',
    onClick ? 'select-none' : '',
    className,
  ].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <div className={base} onClick={onClick} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        {children}
      </div>
    );
  }

  return <div className={base}>{children}</div>;
}
