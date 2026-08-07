import React from 'react';

interface AvatarProps {
  label: string;
  isLocal?: boolean;
  size?: 'sm' | 'md' | 'lg';
  status?: 'connected' | 'connecting' | 'disconnected' | 'failed';
  className?: string;
  imageSrc?: string;
}

const sizes = {
  sm: { wrap: 'w-7 h-7', text: 'text-xs', dot: 'w-2 h-2' },
  md: { wrap: 'w-9 h-9', text: 'text-sm', dot: 'w-2.5 h-2.5' },
  lg: { wrap: 'w-11 h-11', text: 'text-base', dot: 'w-3 h-3' },
};

const statusDot: Record<string, string> = {
  connected: 'bg-success',
  connecting: 'bg-gold animate-pulse-slow',
  disconnected: 'bg-secondary',
  failed: 'bg-danger',
};

function getInitials(label: string): string {
  if (label === 'You') return 'Y';
  const words = label.trim().split(' ');
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function Avatar({ label, isLocal = false, size = 'md', status, className = '', imageSrc }: AvatarProps) {
  const s = sizes[size];
  const initials = getInitials(label);

  const bgClass = isLocal ? 'bg-white text-black' : 'bg-white/10 text-white border border-white/20';

  return (
    <div className={['relative flex-shrink-0', className].join(' ')}>
      <div
        className={[s.wrap, s.text, 'rounded-full flex items-center justify-center font-semibold overflow-hidden', bgClass].join(' ')}
        title={label}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
        ) : initials}
      </div>
      {status && (
        <span className={[
          'absolute bottom-0 right-0 rounded-full',
          s.dot,
          statusDot[status] ?? 'bg-secondary',
          'border border-[#0E0907]',
        ].join(' ')} />
      )}
    </div>
  );
}
