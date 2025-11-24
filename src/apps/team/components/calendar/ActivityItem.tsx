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
    <div className={`flex gap-3 items-start py-3 md:py-2.5 px-3 md:px-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors touch-manipulation cursor-pointer ${borderClasses}`}>
      <div className={`w-9 h-9 md:w-8 md:h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className='w-5 h-5 md:w-4 md:h-4 text-[#202020]' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='text-xs md:text-[13px] text-[#202020] font-normal'>{title}</div>
        <div className='text-xs text-[#606060] mt-0.5'>{subtitle}</div>
        <div className='text-[11px] text-[#808080] mt-1'>{time}</div>
      </div>
    </div>
  );
};
