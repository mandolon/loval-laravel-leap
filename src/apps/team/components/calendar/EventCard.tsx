import React from 'react';
import { EventItem } from '../../types/calendar';
import { EVENT_KIND_TO_COLOR } from '../../constants/calendarConstants';
import { ManualEventDetailsPopover } from './ManualEventDetailsPopover';
import { TaskEventDetailsPopover } from './TaskEventDetailsPopover';
import { RequestEventDetailsPopover } from './RequestEventDetailsPopover';

interface EventCardProps {
  event: EventItem;
  showBorder?: boolean;
  workspaceId: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, showBorder = false, workspaceId }) => {
  const colorClass = EVENT_KIND_TO_COLOR[event.kind];

  // Convert EventItem to the format expected by the popovers
  const eventDetails = {
    id: (event as any)._internalId || event.id,
    title: event.title,
    date: (event as any).date || new Date().toISOString().split('T')[0],
    time: event.time,
    projectId: (event as any).project || null,
    anyTime: !event.time || event.time === 'Any time' || event.time === 'All day',
    eventType: (event as any).eventType || (event.kind === 'event' ? 'Meeting' : event.kind === 'task' ? 'Task' : 'Request'),
    description: (event as any).description || '',
    workspaceId: (event as any)._workspaceId || workspaceId,
  };

  const cardContent = (
    <div
      className={`flex items-center gap-2 py-3 md:py-2.5 px-3 md:px-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors group touch-manipulation cursor-pointer ${
        showBorder ? 'border-t border-neutral-100' : ''
      }`}
    >
      <div className='flex items-center gap-2 min-w-0 flex-1'>
        <div className={`w-1 h-5 md:h-4 rounded-full shrink-0 ${colorClass}`} />
        <span className='text-sm text-[#202020] leading-tight truncate'>{event.title}</span>
      </div>
      <span className='text-xs text-[#505050] tabular-nums font-medium text-right w-16 shrink-0 ml-2'>
        {event.time}
      </span>
    </div>
  );

  // Wrap with appropriate popover based on event kind
  if (event.kind === 'event') {
    return (
      <ManualEventDetailsPopover
        event={eventDetails}
        workspaceId={workspaceId}
      >
        {cardContent}
      </ManualEventDetailsPopover>
    );
  } else if (event.kind === 'task') {
    return (
      <TaskEventDetailsPopover event={eventDetails} workspaceId={workspaceId}>
        {cardContent}
      </TaskEventDetailsPopover>
    );
  } else if (event.kind === 'request') {
    return (
      <RequestEventDetailsPopover event={eventDetails} workspaceId={workspaceId}>
        {cardContent}
      </RequestEventDetailsPopover>
    );
  }

  return cardContent;
};
