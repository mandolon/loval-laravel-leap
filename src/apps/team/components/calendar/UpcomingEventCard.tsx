import React from 'react';
import { UpcomingEventItem } from '../../types/calendar';
import { EVENT_KIND_TO_COLOR } from '../../constants/calendarConstants';

interface UpcomingEventCardProps {
  item: UpcomingEventItem;
  showBorder: boolean;
}

export const UpcomingEventCard: React.FC<UpcomingEventCardProps> = ({ item, showBorder }) => {
  const barClass = EVENT_KIND_TO_COLOR[item.kind];

  return (
    <div
      className={`flex items-start gap-3 px-3 md:px-4 py-3 md:py-2.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors touch-manipulation cursor-pointer ${
        showBorder ? 'border-t border-neutral-100' : ''
      }`}
    >
      {/* Date block */}
      <div className='flex items-start gap-2 w-14 shrink-0'>
        <div className='flex flex-col items-end w-full'>
          <span className='text-2xl leading-none font-semibold text-[#202020] tabular-nums'>
            {item.day}
          </span>
          <span className='text-[10px] text-[#606060] mt-0.5 uppercase tracking-wider font-medium'>
            {item.weekday}
          </span>
        </div>
        <div className={`w-1 self-stretch rounded-full ${barClass}`} />
      </div>

      {/* Event content */}
      <div className='flex-1'>
        <div className='text-sm text-[#202020] font-medium leading-snug'>{item.title}</div>
        <div className='text-xs text-[#505050] mt-1.5 font-medium tabular-nums'>{item.time}</div>
      </div>
    </div>
  );
};
