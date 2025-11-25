// Calendar-related types for team dashboard

export interface CalendarDay {
  index: number;
  day: number;
  monthShort: string;
  year: number;
  weekday: string;
  fullDate: Date;
  isToday: boolean;
}

export type EventKind = 'event' | 'request' | 'task';

export interface EventItem {
  id: number;
  time: string;
  title: string;
  kind: EventKind;
}

export interface UpcomingEventItem {
  id: number;
  month: string;
  day: number;
  weekday: string;
  time: string;
  title: string;
  kind: EventKind;
  date?: string; // YYYY-MM-DD format
  project?: string | null;
  eventType?: string;
  description?: string;
}

export interface RecentFileItem {
  id: number;
  fileId: string;
  name: string;
  project: string;
  folder: string;
  date: string;
  ext: string;
  colorClass: string;
  storagePath: string;
}

export interface ActivityItemType {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: React.ReactNode;
  subtitle: string;
  time: string;
}
import type React from 'react';
