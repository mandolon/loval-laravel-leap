import React, { useEffect } from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
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
  const railGradient = `linear-gradient(180deg, hsl(222 47% 10%) 0%, hsl(222 47% 8%) 55%, hsl(222 47% 6%) 100%),
  radial-gradient(80% 50% at 50% 0%, hsl(213 94% 68% / 0.14), transparent),
  radial-gradient(80% 50% at 50% 100%, hsl(259 94% 68% / 0.12), transparent)`;

  // Ensure shine keyframes exist once
  useEffect(() => {
    const styleId = 'pill-button-shine';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes pill-border-shine {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <button
      className={`relative h-7 inline-flex items-center justify-center rounded-full p-[1px] text-[12px] font-semibold text-neutral-50 shadow-2xl group overflow-hidden ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.08) 100%)',
        backgroundSize: '200% 200%',
        animation: 'pill-border-shine 1.6s linear infinite',
      }}
      {...props}
    >
      <span
        className="h-full w-full rounded-full inline-flex items-center justify-center gap-1.5 pl-3 pr-4 bg-black/0"
        style={{ background: railGradient }}
      >
        {Icon && <Icon className={`${iconSize} flex-shrink-0`} strokeWidth={2.5} />}
        <span className="flex items-center leading-none -translate-y-[1px]">{children}</span>
      </span>
    </button>
  );
};
