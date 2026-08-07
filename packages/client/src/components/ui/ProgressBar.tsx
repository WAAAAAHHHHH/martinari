import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0–100
  variant?: 'accent' | 'success' | 'danger' | 'gold';
  animated?: boolean;
  height?: 'xs' | 'sm' | 'md';
  className?: string;
}

const trackColors = {
  accent: 'bg-[rgba(200,74,15,0.12)]',
  success: 'bg-[rgba(94,158,90,0.12)]',
  danger: 'bg-[rgba(200,64,64,0.12)]',
  gold: 'bg-[rgba(184,128,10,0.12)]',
};

const fillColors = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  gold: 'bg-gold',
};

const heights = { xs: 'h-[3px]', sm: 'h-1.5', md: 'h-2' };

export function ProgressBar({
  value,
  variant = 'accent',
  animated = true,
  height = 'sm',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={[heights[height], 'w-full rounded-full overflow-hidden', trackColors[variant], className].join(' ')}
      role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}
    >
      <motion.div
        className={['h-full rounded-full relative overflow-hidden', fillColors[variant]].join(' ')}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 22 }}
      >
        {animated && clamped > 0 && clamped < 100 && (
          <div className="absolute inset-0 progress-shimmer" />
        )}
      </motion.div>
    </div>
  );
}
