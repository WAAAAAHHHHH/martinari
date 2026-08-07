import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId}
          className="section-label">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'input-base w-full h-11 text-sm',
            icon ? 'pl-9' : 'pl-3.5',
            iconRight ? 'pr-9' : 'pr-3.5',
            error ? '!border-danger/40 focus:!shadow-[0_0_0_3px_rgba(200,64,64,0.08)]' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted flex items-center">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
