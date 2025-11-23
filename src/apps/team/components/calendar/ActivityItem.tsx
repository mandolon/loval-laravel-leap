import React from 'react';

interface ActivityItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  subtitle: string;
  time: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  time,
}) => (
  <div className='flex gap-3 items-center py-3 md:py-2.5 px-3 md:px-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors touch-manipulation cursor-pointer'>
    <div className={`w-9 h-9 md:w-8 md:h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon className='w-5 h-5 md:w-4 md:h-4 text-[#202020]' />
    </div>
    <div className='flex-1 min-w-0'>
      <div className='text-sm text-[#202020] font-medium'>{title}</div>
      <div className='text-xs text-[#606060] mt-0.5'>{subtitle}</div>
      <div className='text-[11px] text-[#808080] mt-1'>{time}</div>
    </div>
  </div>
);
