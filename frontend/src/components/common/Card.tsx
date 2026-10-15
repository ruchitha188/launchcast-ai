import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'violet' | 'none'; // Kept for backwards compatibility
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'rounded-lg bg-[#171F2A] border border-[#2A3544] p-4 text-[#E7EDF5] transition-colors',
        className
      )}
    >
      {(title || subtitle || badge || action) && (
        <div className="flex items-start justify-between mb-3.5 border-b border-[#2A3544] pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              {title && <h3 className="font-semibold text-[#E7EDF5] text-sm tracking-tight">{title}</h3>}
              {badge}
            </div>
            {subtitle && <p className="text-xs text-[#9AA9BC] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
