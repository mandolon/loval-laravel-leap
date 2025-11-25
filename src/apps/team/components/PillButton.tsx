import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }>;
  iconSize?: string;
  children: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  icon: Icon,
  iconSize = 'w-3.5 h-3.5',
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`h-7 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-neutral-50 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-black border border-white/5 shadow-2xl transition-colors hover:from-neutral-800 hover:via-neutral-800/90 hover:to-neutral-950 ${className}`}
      {...props}
    >
      {Icon && <Icon className={`${iconSize} flex-shrink-0`} strokeWidth={2.5} />}
      <span className="flex items-center leading-none -translate-y-[1px]">{children}</span>
    </button>
  );
};
