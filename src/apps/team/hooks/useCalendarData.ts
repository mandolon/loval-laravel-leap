import { useMemo } from 'react';
import { useWorkspaceTasks } from '@/lib/api/hooks/useTasks';
import { useWorkspaceRequests } from '@/lib/api/hooks/useRequests';
import { useWorkspaceCalendarEvents } from '@/lib/api/hooks/useCalendarEvents';
import type { EventItem, UpcomingEventItem } from '../types/calendar';

/**
 * Parse a date string (YYYY-MM-DD) to a local Date object without timezone issues.
 * This avoids the problem where new Date("2025-01-15") creates a UTC timestamp
 * that shows as Jan 14 in PST timezone.
 */
function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface UseCalendarDataOptions {
  workspaceId: string;
}

interface UseCalendarDataResult {
  allEvents: UpcomingEventItem[];
  eventsForDay: (dayIndex: number, calendarDays: any[]) => EventItem[];
  upcomingEvents: UpcomingEventItem[];
  isLoading: boolean;
}

/**
 * Custom hook to fetch and combine all calendar events from different sources:
 * - Manual calendar events (kind='event')
 * - Tasks with due dates (kind='task')
 * - Requests with respond_by dates (kind='request')
 */
export function useCalendarData({ workspaceId }: UseCalendarDataOptions): UseCalendarDataResult {
  const { data: tasks = [], isLoading: tasksLoading } = useWorkspaceTasks(workspaceId);
  const { data: requests = [], isLoading: requestsLoading } = useWorkspaceRequests(workspaceId);
  const { data: calendarEvents = [], isLoading: eventsLoading } = useWorkspaceCalendarEvents(workspaceId);

  const isLoading = tasksLoading || requestsLoading || eventsLoading;

  // Transform and combine all events into UpcomingEventItem format
  const allEvents = useMemo((): UpcomingEventItem[] => {
    const combined: UpcomingEventItem[] = [];
    let idCounter = 1;

    // Add manual calendar events
    calendarEvents.forEach((event) => {
      const eventDate = parseDateLocal(event.eventDate);
      const timeDisplay = event.eventTime
        ? (() => {
            const [hours, minutes] = event.eventTime.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
          })()
        : 'Any time';

      combined.push({
        id: idCounter++,
        month: eventDate.toLocaleDateString('en-US', { month: 'short' }),
        day: eventDate.getDate(),
        weekday: eventDate.toLocaleDateString('en-US', { weekday: 'short' }),
        time: timeDisplay,
        title: event.title,
        kind: 'event',
        date: event.eventDate,
        project: event.projectId || null,
        eventType: event.eventType,
        description: event.description,
        _internalId: event.id, // Store the actual DB ID for editing
        _workspaceId: event.workspaceId,
      } as any);
    });

    // Add tasks with due dates
    tasks.forEach((task) => {
      if (!task.dueDate) return;

      const dueDate = parseDateLocal(task.dueDate);
      combined.push({
        id: idCounter++,
        month: dueDate.toLocaleDateString('en-US', { month: 'short' }),
        day: dueDate.getDate(),
        weekday: dueDate.toLocaleDateString('en-US', { weekday: 'short' }),
        time: 'All day',
        title: task.title,
        kind: 'task',
        date: task.dueDate,
        project: task.projectId || null,
        eventType: 'Task',
        description: task.description,
        _internalId: task.id, // Store the actual DB ID
        _workspaceId: workspaceId,
      } as any);
    });

    // Add requests with respond_by dates
    requests.forEach((request) => {
      if (!request.respondBy) return;

      const respondByDate = parseDateLocal(request.respondBy);
      combined.push({
        id: idCounter++,
        month: respondByDate.toLocaleDateString('en-US', { month: 'short' }),
        day: respondByDate.getDate(),
        weekday: respondByDate.toLocaleDateString('en-US', { weekday: 'short' }),
        time: 'All day',
        title: request.title,
        kind: 'request',
        date: request.respondBy,
        project: request.projectId || null,
        eventType: 'Request',
        description: request.body, // Request body as description
        _internalId: request.id, // Store the actual DB ID
        _workspaceId: request.workspaceId,
      } as any);
    });

    // Sort by date (earliest first)
    return combined.sort((a, b) => {
      const dateA = parseDateLocal(a.date!);
      const dateB = parseDateLocal(b.date!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [calendarEvents, tasks, requests, workspaceId]);

  // Get events for a specific calendar day
  const eventsForDay = useMemo(
    () => (dayIndex: number, calendarDays: any[]): EventItem[] => {
      const day = calendarDays[dayIndex];
      if (!day) return [];

      // Use fullDate to get correct date string (avoid timezone issues)
      // CalendarDay.fullDate is already a Date object in local time
      const year = day.fullDate.getFullYear();
      const month = String(day.fullDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(day.fullDate.getDate()).padStart(2, '0');
      const dayDateStr = `${year}-${month}-${dayNum}`;

      return allEvents
        .filter((event) => event.date === dayDateStr)
        .map((event) => ({
          id: event.id,
          time: event.time,
          title: event.title,
          kind: event.kind,
          _internalId: (event as any)._internalId,
          _workspaceId: (event as any)._workspaceId,
          date: event.date,
          project: event.project,
          eventType: event.eventType,
          description: event.description,
        } as any));
    },
    [allEvents]
  );

  // Get upcoming events (events from today onwards)
  const upcomingEvents = useMemo((): UpcomingEventItem[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allEvents.filter((event) => {
      if (!event.date) return false;
      const eventDate = parseDateLocal(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
  }, [allEvents]);

  return {
    allEvents,
    eventsForDay,
    upcomingEvents,
    isLoading,
  };
}
