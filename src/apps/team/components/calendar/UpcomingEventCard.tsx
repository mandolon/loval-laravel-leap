import React from 'react';
import { UpcomingEventItem } from '../../types/calendar';
import { EVENT_KIND_TO_COLOR } from '../../constants/calendarConstants';
import { ManualEventDetailsPopover } from './ManualEventDetailsPopover';
import { TaskEventDetailsPopover } from './TaskEventDetailsPopover';
import { RequestEventDetailsPopover } from './RequestEventDetailsPopover';

interface UpcomingEventCardProps {
  item: UpcomingEventItem;
  showBorder: boolean;
}

export const UpcomingEventCard: React.FC<UpcomingEventCardProps> = ({ item, showBorder }) => {
  const barClass = EVENT_KIND_TO_COLOR[item.kind];

  // Convert UpcomingEventItem to the format expected by the popovers
  const eventDetails = {
    id: item.id,
    title: item.title,
    date: item.date || `2024-11-${String(item.day).padStart(2, '0')}`, // Fallback to construct from day
    time: item.time,
    project: item.project || null,
    anyTime: !item.time || item.time === 'Any time',
    eventType: item.eventType || (item.kind === 'event' ? 'Meeting' : item.kind === 'task' ? 'Task' : 'Request'),
    description: item.description || '',
  };

  const cardContent = (
    <div
      className={`flex items-stretch gap-1.5 px-3 md:px-4 py-3 md:py-2.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors touch-manipulation cursor-pointer ${
        showBorder ? 'border-t border-neutral-100' : ''
      }`}
    >
      {/* Date */}
      <div className='flex flex-col items-end w-8 shrink-0'>
        <span className='text-2xl leading-none font-semibold text-[#202020] tabular-nums'>
          {item.day}
        </span>
        <span className='text-[10px] text-[#606060] mt-0.5 uppercase tracking-wider font-medium'>
          {item.weekday}
        </span>
      </div>

      {/* Color bar */}
      <div className={`w-1 rounded-full ${barClass} shrink-0 mx-1`} />

      {/* Event content */}
      <div className='flex-1 min-w-0'>
        <div className='text-sm text-[#202020] font-normal leading-snug text-left'>
          {item.title.includes(':') ? (
            <>
              <span className='font-medium'>{item.title.split(':')[0]}:</span>
              <span> {item.title.split(':').slice(1).join(':')}</span>
            </>
          ) : (
            item.title
          )}
        </div>
        <div className='text-xs text-[#505050] mt-1.5 font-medium tabular-nums'>{item.time}</div>
      </div>
    </div>
  );

  // Wrap with appropriate popover based on event kind
  if (item.kind === 'event') {
    return (
      <ManualEventDetailsPopover 
        event={eventDetails}
        onSave={(updated) => console.log('Event updated:', updated)}
      >
        {cardContent}
      </ManualEventDetailsPopover>
    );
  } else if (item.kind === 'task') {
    return (
      <TaskEventDetailsPopover event={eventDetails}>
        {cardContent}
      </TaskEventDetailsPopover>
    );
  } else if (item.kind === 'request') {
    return (
      <RequestEventDetailsPopover event={eventDetails}>
        {cardContent}
      </RequestEventDetailsPopover>
    );
  }

  return cardContent;
};
