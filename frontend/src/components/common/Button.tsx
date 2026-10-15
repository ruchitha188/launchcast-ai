import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-[#10151D] disabled:opacity-40 disabled:cursor-not-allowed select-none';
  
  const variants = {
    // Understated solid teal for primary actions
    primary: 'bg-[#4DAEAB] hover:bg-[#65C4BF] text-[#0C1118] font-semibold focus:ring-[#4DAEAB]',
    // Secondary quiet enterprise surface
    secondary: 'bg-[#1D2734] hover:bg-[#232E3D] text-[#E7EDF5] border border-[#2A3544] font-medium focus:ring-[#4DAEAB]',
    // Outline with subtle border
    outline: 'border border-[#2A3544] bg-[#171F2A] hover:bg-[#1D2734] text-[#E7EDF5] hover:border-[#3A485B] focus:ring-[#4DAEAB]',
    // Ghost for muted inline triggers
    ghost: 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#1D2734] focus:ring-slate-500',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
