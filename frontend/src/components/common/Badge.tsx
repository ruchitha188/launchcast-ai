import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'slate';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  className = '',
}) => {
  // Restrained, muted enterprise tags
  const styles = {
    cyan: 'bg-[#142C30] text-[#65C4BF] border-[#26555C]',
    violet: 'bg-[#201D33] text-[#B4A5EC] border-[#383359]',
    emerald: 'bg-[#133227] text-[#36B98A] border-[#1B4A3A]',
    amber: 'bg-[#3B2D0E] text-[#E5B454] border-[#584314]',
    slate: 'bg-[#1D2734] text-[#9AA9BC] border-[#2A3544]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border font-mono',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
