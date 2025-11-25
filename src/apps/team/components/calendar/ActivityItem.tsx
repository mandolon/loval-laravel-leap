import React from 'react';

interface ActivityItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: React.ReactNode;
  subtitle: string;
  time: string;
  showBorder?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  time,
  showBorder,
  isFirst,
  isLast,
}) => {
  const borderClasses = [
    showBorder ? 'border-t border-neutral-100' : '',
    isFirst ? 'border-t border-neutral-100' : '',
    isLast ? 'border-b border-neutral-100' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors touch-manipulation cursor-pointer ${borderClasses}`}>
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className='w-4 h-4 text-current' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='activity-title-token truncate'>
          {title}
        </div>
        <div className='text-xs text-[#6b7280] mt-0.5 truncate'>{subtitle}</div>
        <div className='text-[11px] text-[#94a3b8] mt-1'>{time}</div>
      </div>
    </div>
  );
};
