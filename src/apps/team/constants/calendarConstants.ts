import { EventKind, EventItem, UpcomingEventItem, RecentFileItem } from '../types/calendar';
import { ListChecks, Bot, FolderClosed } from 'lucide-react';

export const EVENT_KIND_TO_COLOR: Record<EventKind, string> = {
  event: 'bg-emerald-500',
  request: 'bg-rose-500',
  task: 'bg-amber-500',
};

// Mock events data - keyed by calendar day index
export const EVENTS: Record<number, EventItem[]> = {
  4: [
    { id: 1, time: '9:30 AM', title: "Groceries — Raley's", kind: 'event' },
    { id: 2, time: '11:15 AM', title: 'Coffee + snacks', kind: 'event' },
    { id: 3, time: '2:45 PM', title: 'Home Depot — materials', kind: 'task' },
  ],
  3: [
    { id: 4, time: '8:00 AM', title: 'Framing package', kind: 'task' },
    { id: 5, time: '1:30 PM', title: 'Lunch with client', kind: 'event' },
    { id: 6, time: '4:00 PM', title: 'Gas + tolls', kind: 'event' },
  ],
  5: [
    { id: 7, time: '10:00 AM', title: 'Software — Revit plugins', kind: 'task' },
    { id: 8, time: '2:30 PM', title: 'Cloud storage', kind: 'request' },
    { id: 9, time: '5:15 PM', title: 'Surveyor invoice', kind: 'request' },
  ],
};

export const UPCOMING_EVENTS: UpcomingEventItem[] = [
  {
    id: 101,
    month: 'November',
    day: 18,
    weekday: 'Tue',
    time: '1:00 PM',
    title: 'Task: U Street exterior stairs',
    kind: 'task',
  },
  {
    id: 102,
    month: 'November',
    day: 20,
    weekday: 'Thu',
    time: '10:30 AM',
    title: 'Site visit: Echo Summit Cabin',
    kind: 'event',
  },
  {
    id: 103,
    month: 'November',
    day: 22,
    weekday: 'Sat',
    time: '2:00 PM',
    title: 'Task: Review structural drawings',
    kind: 'task',
  },
  {
    id: 104,
    month: 'November',
    day: 25,
    weekday: 'Tue',
    time: '4:15 PM',
    title: 'Request: Sonoma Duplex',
    kind: 'request',
  },
  {
    id: 105,
    month: 'November',
    day: 28,
    weekday: 'Fri',
    time: '9:00 AM',
    title: 'Event: Client presentation',
    kind: 'event',
  },
  {
    id: 106,
    month: 'December',
    day: 2,
    weekday: 'Tue',
    time: '11:00 AM',
    title: 'Task: Submit permit application',
    kind: 'task',
  },
  {
    id: 107,
    month: 'December',
    day: 5,
    weekday: 'Fri',
    time: '3:30 PM',
    title: 'Request: Material quotes',
    kind: 'request',
  },
  {
    id: 108,
    month: 'December',
    day: 8,
    weekday: 'Mon',
    time: '10:00 AM',
    title: 'Event: Site inspection',
    kind: 'event',
  },
  {
    id: 109,
    month: 'December',
    day: 12,
    weekday: 'Fri',
    time: '1:00 PM',
    title: 'Task: Finalize design documents',
    kind: 'task',
  },
  {
    id: 110,
    month: 'December',
    day: 15,
    weekday: 'Mon',
    time: '2:30 PM',
    title: 'Request: Budget approval',
    kind: 'request',
  },
];

export const RECENT_FILES: RecentFileItem[] = [
  {
    id: 1,
    fileId: 'file-1',
    name: 'Echo Summit Cabin — floor plans.pdf',
    project: 'Echo Summit Cabin',
    folder: 'Plans',
    date: '2 hours ago',
    ext: 'PDF',
    colorClass: 'bg-rose-400 text-white',
    storagePath: '/plans/floor-plans.pdf',
  },
  {
    id: 2,
    fileId: 'file-2',
    name: 'U Street Exterior — 3D model.ifc',
    project: 'U Street Exterior',
    folder: '3D Models',
    date: '4 hours ago',
    ext: 'IFC',
    colorClass: 'bg-sky-400 text-white',
    storagePath: '/3d-models/model.ifc',
  },
  {
    id: 3,
    fileId: 'file-3',
    name: 'Lehman Garage — cost estimate.xlsx',
    project: 'Lehman Garage',
    folder: 'Attachments',
    date: 'Yesterday',
    ext: 'XLS',
    colorClass: 'bg-emerald-400 text-white',
    storagePath: '/attachments/cost-estimate.xlsx',
  },
  {
    id: 4,
    fileId: 'file-4',
    name: 'Sonoma Duplex — redlines.pdf',
    project: 'Sonoma Duplex',
    folder: 'Plans',
    date: 'Last week',
    ext: 'PDF',
    colorClass: 'bg-rose-400 text-white',
    storagePath: '/plans/redlines.pdf',
  },
];

// Activity feed items with icons
export const ACTIVITY_ITEMS = [
  {
    id: 1,
    icon: ListChecks,
    iconBg: 'bg-neutral-100',
    title: 'Task completed',
    subtitle: 'Site survey measurements uploaded',
    time: '15 minutes ago',
  },
  {
    id: 2,
    icon: Bot,
    iconBg: 'bg-neutral-100',
    title: 'AI analysis complete',
    subtitle: 'Point cloud processing finished',
    time: '3 hours ago',
  },
  {
    id: 3,
    icon: FolderClosed,
    iconBg: 'bg-neutral-100',
    title: 'File uploaded',
    subtitle: '3D scan data added to project',
    time: '5 hours ago',
  },
];
