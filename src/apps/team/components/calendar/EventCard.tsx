import React from 'react';
import { EventItem } from '../../types/calendar';
import { EVENT_KIND_TO_COLOR } from '../../constants/calendarConstants';

interface EventCardProps {
  event: EventItem;
  showBorder?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, showBorder = false }) => {
  const colorClass = EVENT_KIND_TO_COLOR[event.kind];

  return (
    <div
      className={`flex items-center gap-2 py-3 md:py-2.5 px-3 md:px-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors group touch-manipulation cursor-pointer ${
        showBorder ? 'border-t border-neutral-100' : ''
      }`}
    >
      <span className='text-xs text-[#505050] w-14 shrink-0 tabular-nums font-medium text-right'>
        {event.time}
      </span>
      <div className={`w-1 h-5 md:h-4 rounded-full shrink-0 ${colorClass}`} />
      <span className='text-sm text-[#202020] flex-1 leading-tight'>{event.title}</span>
    </div>
  );
};
