import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { CalendarDay, RecentFileItem, ActivityItemType } from '../../types';
import { getCurrentDate, getCurrentDateShort } from '../../utils';
import { useCalendarData } from '../../hooks/useCalendarData';
import { EventCard } from './EventCard';
import { UpcomingEventCard } from './UpcomingEventCard';
import { ActivityItem } from './ActivityItem';
import { FileItem } from './FileItem';
import AddEventPopover from './AddEventPopover';
import { useNotifications } from '@/lib/api/hooks/useNotifications';
import { useUserRecentFiles } from '@/lib/api/hooks/useRecentFiles';
import { FolderClosed, Settings, Bell, CheckSquare, MessageCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const DAYS_TO_SHOW = 31; // 15 before, today, 15 after
const DAYS_BEFORE_CENTER = 15;
const DAYS_AFTER_CENTER = 15;
const JUMP_DAYS = 30; // When clicking arrows, jump 30 days

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Generate 31 calendar days centered around a specific date
const generateCalendarDaysAroundDate = (centerDate: Date): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate days: 15 before center, center, 15 after center
  for (let i = -DAYS_BEFORE_CENTER; i <= DAYS_AFTER_CENTER; i++) {
    const currentDate = new Date(centerDate);
    currentDate.setDate(centerDate.getDate() + i);
    currentDate.setHours(0, 0, 0, 0);

    days.push({
      index: i + DAYS_BEFORE_CENTER, // Index 0-30, with center at index 15
      day: currentDate.getDate(),
      monthShort: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      weekday: dayNames[currentDate.getDay()],
      fullDate: new Date(currentDate),
      isToday: isSameDay(currentDate, today),
    });
  }

  return days;
};

// Helper function to get file extension from filename
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toUpperCase();
    return ext.substring(0, 3);
  }
  return 'FILE';
};

// Helper function to get color class for file extension
const getFileColorClass = (mimetype: string | null, filename: string): string => {
  if (mimetype) {
    if (mimetype.includes('pdf')) return 'bg-rose-400 text-white';
    if (mimetype.includes('image')) return 'bg-purple-400 text-white';
    if (mimetype.includes('video')) return 'bg-pink-400 text-white';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'bg-emerald-400 text-white';
    if (mimetype.includes('document') || mimetype.includes('word')) return 'bg-blue-400 text-white';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'bg-orange-400 text-white';
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'bg-rose-400 text-white';
  if (ext === 'ifc' || ext === 'obj' || ext === 'fbx') return 'bg-sky-400 text-white';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'bg-emerald-400 text-white';
  if (ext === 'docx' || ext === 'doc') return 'bg-blue-400 text-white';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return 'bg-purple-400 text-white';

  return 'bg-neutral-400 text-white';
};

const iconBgMap: Record<string, string> = {
  task: 'bg-emerald-600 text-white',
  request: 'bg-amber-600 text-white',
  file: 'bg-sky-600 text-white',
  chat: 'bg-indigo-600 text-white',
  default: 'bg-slate-700 text-white',
};

const ACTIVE_EVENTS_HEIGHT = 'clamp(170px, 32vh, 220px)';

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const emphasizeRequest = (text: string): React.ReactNode => {
  if (!text) return text;
  const match = text.match(/request/i);
  if (!match || match.index === undefined) return text;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {text.slice(0, start)}
      <span className='font-semibold text-amber-600'>Request</span>
      {text.slice(end)}
    </>
  );
};

const getFullMonthName = (month: string): string => {
  const trimmed = (month || '').trim();
  if (!trimmed) return month;
  const lower = trimmed.toLowerCase();
  const shortToFull: Record<string, string> = {
    jan: 'January',
    feb: 'February',
    mar: 'March',
    apr: 'April',
    may: 'May',
    jun: 'June',
    jul: 'July',
    aug: 'August',
    sep: 'September',
    sept: 'September',
    oct: 'October',
    nov: 'November',
    dec: 'December',
  };
  if (shortToFull[lower]) return shortToFull[lower];
  const fullMatch = FULL_MONTHS.find((m) => m.toLowerCase() === lower);
  return fullMatch || month;
};

const formatNotificationTitle = (notification: any): React.ReactNode => {
  const baseTitle = notification?.title || '';
  const actorName = notification?.metadata && typeof notification.metadata === 'object'
    ? (notification.metadata as any).actorName
    : undefined;

  const normalizedTitle = baseTitle.replace(/assigned you a request/gi, 'sent you a request');

  if (!actorName || typeof actorName !== 'string') {
    return normalizedTitle;
  }

  const lowerTitle = normalizedTitle.toLowerCase();
  const lowerActor = actorName.toLowerCase();
  const idx = lowerTitle.indexOf(lowerActor);

  if (idx !== -1) {
    const before = normalizedTitle.slice(0, idx);
    const highlighted = normalizedTitle.slice(idx, idx + actorName.length);
    const after = normalizedTitle.slice(idx + actorName.length);

    return (
      <span className='text-[#202020]'>
        {before}
        <span className='font-semibold'>{highlighted}</span>
        {emphasizeRequest(after)}
      </span>
    );
  }

  return (
    <span className='text-[#202020]'>
      <span className='font-semibold'>{actorName}</span>
      {normalizedTitle ? <> {emphasizeRequest(normalizedTitle)}</> : ''}
    </span>
  );
};

const getNotificationIcon = (type: string): { icon: React.ComponentType<{ className?: string }>, iconBg: string } => {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('message') || typeLower.includes('chat')) {
    return { icon: MessageSquare, iconBg: iconBgMap.chat };
  }
  if (typeLower.includes('file') || typeLower.includes('upload') || typeLower.includes('model')) {
    return { icon: FolderClosed, iconBg: iconBgMap.file };
  }
  if (typeLower.includes('request')) {
    return { icon: MessageCircle, iconBg: iconBgMap.request };
  }
  if (typeLower.includes('task')) {
    return { icon: CheckSquare, iconBg: iconBgMap.task };
  }

  return { icon: Bell, iconBg: iconBgMap.default };
};

export const CalendarDashboardContent: React.FC = () => {
  const { user } = useUser();
  const { currentWorkspace } = useWorkspaces();

  const [mdUp, setMdUp] = useState(true);

  // Center date state - the date around which we generate 31 days
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [centerDate, setCenterDate] = useState(today);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>(() => generateCalendarDaysAroundDate(today));
  const [selectedIndex, setSelectedIndex] = useState(DAYS_BEFORE_CENTER); // Today is at index 15
  const [centeredIndex, setCenteredIndex] = useState(DAYS_BEFORE_CENTER); // Track which day is centered in viewport
  const [stickyMonth, setStickyMonth] = useState<string>('');

  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const upcomingEventsScrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { allEvents, eventsForDay: getEventsForDay, upcomingEvents, isLoading: calendarDataLoading } = useCalendarData({
    workspaceId: currentWorkspace?.id || '',
  });

  const { data: allNotifications = [], isLoading: isLoadingActivity, isError: isActivityError } = useNotifications(user?.id || '');

  const { data: recentFilesData = [], isLoading: isLoadingFiles } = useUserRecentFiles(
    user?.id || '',
    currentWorkspace?.id || '',
    10
  );

  // Filter notifications to last 14 days
  const recentNotifications = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    return allNotifications.filter(notification => {
      try {
        const notificationDate = new Date(notification.createdAt);
        return notificationDate >= fourteenDaysAgo;
      } catch (e) {
        return false;
      }
    });
  }, [allNotifications]);

  // Transform notifications to activity items
  const activityItems = useMemo<ActivityItemType[]>(() => {
    return recentNotifications.map((notification) => {
      const { icon, iconBg } = getNotificationIcon(notification.type);
      const title = formatNotificationTitle(notification);

      let time = 'recently';
      try {
        const createdDate = new Date(notification.createdAt);
        if (!isNaN(createdDate.getTime())) {
          time = formatDistanceToNow(createdDate, { addSuffix: true });
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }

      return {
        id: parseInt(notification.id.replace(/-/g, '').substring(0, 15), 16),
        icon,
        iconBg,
        title,
        subtitle: notification.content || '',
        time,
      };
    });
  }, [recentNotifications]);

  // Transform recent files data
  const recentFiles = useMemo<RecentFileItem[]>(() => {
    return recentFilesData.map((file) => {
      const ext = getFileExtension(file.filename || 'file');
      const colorClass = getFileColorClass(file.mimetype, file.filename || 'file');

      let date = 'recently';
      try {
        const fileDate = new Date(file.updated_at || file.created_at);
        if (!isNaN(fileDate.getTime())) {
          date = formatDistanceToNow(fileDate, { addSuffix: true });
        }
      } catch (e) {
        console.error('Error parsing file date:', e);
      }

      const projectAddress = file.project?.address;
      const streetAddress = projectAddress?.streetNumber && projectAddress?.streetName
        ? `${projectAddress.streetNumber} ${projectAddress.streetName}`
        : file.project?.name || 'Unknown Project';

      return {
        id: parseInt(file.id.replace(/-/g, '').substring(0, 15), 16),
        fileId: file.id,
        name: file.filename || 'Unnamed file',
        project: streetAddress,
        folder: file.folder?.name || 'Root',
        date,
        ext,
        colorClass,
        storagePath: file.storage_path,
      };
    });
  }, [recentFilesData]);

  useEffect(() => {
    const checkSize = () => setMdUp(window.innerWidth >= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Scroll to center today on initial mount
  useEffect(() => {
    if (calendarScrollRef.current) {
      isProgrammaticScroll.current = true;
      const scrollContainer = calendarScrollRef.current;
      const cardWidth = mdUp ? 88 : 104;
      const viewportWidth = scrollContainer.clientWidth;

      // Center index 15 (today)
      const scrollPosition = (DAYS_BEFORE_CENTER * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

      setTimeout(() => {
        scrollContainer.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 600);
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll to update centered day
  useEffect(() => {
    const scrollContainer = calendarScrollRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = scrollContainer.scrollLeft;
        const cardWidth = mdUp ? 88 : 104;
        const centerPosition = scrollLeft + scrollContainer.clientWidth / 2;
        const estimatedIndex = Math.round(centerPosition / cardWidth);
        const newIndex = Math.max(0, Math.min(estimatedIndex, calendarDays.length - 1));

        if (newIndex !== centeredIndex) {
          setCenteredIndex(newIndex);
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [centeredIndex, calendarDays.length, mdUp]);

  // Group upcoming events by month
  const eventsByMonth = useMemo(() => {
    const grouped = new Map<string, typeof upcomingEvents>();
    upcomingEvents.forEach((event) => {
      const monthKey = getFullMonthName(event.month || '');
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(event);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return months.indexOf(a[0]) - months.indexOf(b[0]);
    });
  }, [upcomingEvents]);

  // Set initial sticky month
  useEffect(() => {
    if (eventsByMonth.length > 0 && !stickyMonth) {
      setStickyMonth(eventsByMonth[0][0]);
    }
  }, [eventsByMonth, stickyMonth]);

  // Intersection observer for sticky month header
  useEffect(() => {
    const scrollContainer = upcomingEventsScrollRef.current;
    if (!scrollContainer || monthRefs.current.size === 0) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const stickyHeaderHeight = 40;

      let currentMonth = stickyMonth;
      let minDistance = Infinity;

      monthRefs.current.forEach((ref, month) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const distanceFromTop = rect.top - (containerRect.top + stickyHeaderHeight);

          if (distanceFromTop <= 0 && Math.abs(distanceFromTop) < minDistance) {
            minDistance = Math.abs(distanceFromTop);
            currentMonth = month;
          }
        }
      });

      if (currentMonth && currentMonth !== stickyMonth) {
        setStickyMonth(currentMonth);
      }
    };

    const observer = new IntersectionObserver(
      () => {
        handleScroll();
      },
      {
        root: scrollContainer,
        rootMargin: `-${60}px 0px 0px 0px`,
        threshold: [0, 0.1, 0.5, 1],
      }
    );

    monthRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      monthRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [eventsByMonth, stickyMonth]);

  if (!currentWorkspace?.id) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4c75d1] border-r-transparent'></div>
          <p className='mt-4 text-sm text-[#606060]'>Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Handle wheel scroll for horizontal scrolling
  const handleCalendarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (calendarScrollRef.current) {
      e.preventDefault();
      calendarScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Jump 30 days forward or backward
  const jumpDays = (direction: 'prev' | 'next') => {
    const daysToJump = direction === 'next' ? JUMP_DAYS : -JUMP_DAYS;
    const newCenterDate = new Date(centerDate);
    newCenterDate.setDate(centerDate.getDate() + daysToJump);

    const newDays = generateCalendarDaysAroundDate(newCenterDate);
    setCenterDate(newCenterDate);
    setCalendarDays(newDays);

    // Set selected index to center (the 30th day from previous position is now at center)
    setSelectedIndex(DAYS_BEFORE_CENTER);
    setCenteredIndex(DAYS_BEFORE_CENTER);

    // Scroll to center the new center date
    setTimeout(() => {
      if (calendarScrollRef.current) {
        isProgrammaticScroll.current = true;
        const scrollContainer = calendarScrollRef.current;
        const cardWidth = mdUp ? 88 : 104;
        const viewportWidth = scrollContainer.clientWidth;

        const scrollPosition = (DAYS_BEFORE_CENTER * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

        scrollContainer.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });

        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 600);
      }
    }, 50);
  };

  // Reset calendar to today
  const resetToToday = () => {
    const newDays = generateCalendarDaysAroundDate(today);
    setCenterDate(today);
    setCalendarDays(newDays);
    setSelectedIndex(DAYS_BEFORE_CENTER);
    setCenteredIndex(DAYS_BEFORE_CENTER);

    setTimeout(() => {
      if (calendarScrollRef.current) {
        isProgrammaticScroll.current = true;
        const scrollContainer = calendarScrollRef.current;
        const cardWidth = mdUp ? 88 : 104;
        const viewportWidth = scrollContainer.clientWidth;

        const scrollPosition = (DAYS_BEFORE_CENTER * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

        scrollContainer.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });

        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 600);
      }
    }, 100);
  };

  // Center a card by index
  const centerCardByIndex = (index: number) => {
    if (calendarScrollRef.current) {
      isProgrammaticScroll.current = true;
      const scrollContainer = calendarScrollRef.current;
      const cardWidth = mdUp ? 88 : 104;
      const viewportWidth = scrollContainer.clientWidth;

      const scrollPosition = (index * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

      scrollContainer.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  };

  // Handle calendar day click
  const handleDayClick = (index: number) => {
    setSelectedIndex(index);
    centerCardByIndex(index);
  };

  // Get visible month label based on centered day
  const getVisibleMonth = () => {
    const day = calendarDays[centeredIndex] || calendarDays[DAYS_BEFORE_CENTER];
    if (!day) return '';
    const yearShort = String(day.year).slice(-2);
    return `${day.monthShort.toUpperCase()} ${yearShort}`;
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const selectedDay = calendarDays[selectedIndex] || calendarDays[DAYS_BEFORE_CENTER];
  const eventsForDayData = getEventsForDay(selectedIndex, calendarDays);
  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <div className='flex-1 flex flex-col min-h-0 px-3 md:px-6 pt-4 md:pt-6 pb-4 gap-0 overflow-y-auto'>
        {/* Welcome section */}
        <div className='flex items-start justify-between gap-4'>
          <div className='px-3 md:px-4'>
            <div className='text-2xl md:text-[26px] leading-tight font-semibold text-[#202020]'>
              {getGreeting()}, {userName}
            </div>
          </div>
        </div>

        {/* Calendar section - Responsive grid layout */}
        <div className='flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(22rem,30%)] lg:grid-rows-[auto_minmax(400px,1fr)] min-h-0 gap-4'>
        {/* Calendar block */}
        <div className='flex flex-col min-w-0 overflow-hidden lg:col-start-1 lg:row-start-1'>
          {/* Calendar scroll area */}
          <div className='rounded-xl bg-white/60 px-3 md:px-4 py-2 shrink-0'>
            <div className='flex items-center justify-between gap-2 mb-4'>
              <div className='text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-[#606060] text-left flex-1 min-w-0 flex items-baseline gap-1'>
                <span>Today is</span>
                <button
                  onClick={resetToToday}
                  className='text-[#4c75d1] font-medium hover:text-[#202020] transition-colors cursor-pointer touch-manipulation truncate uppercase'
                >
                  <span className='inline md:hidden'>{getCurrentDateShort()}</span>
                  <span className='hidden md:inline'>{getCurrentDate()}</span>
                </button>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <div className='text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-[#202020] font-medium'>
                  {getVisibleMonth()}
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => jumpDays('prev')}
                    className='w-9 h-9 md:w-7 md:h-7 flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 rounded-md transition-colors touch-manipulation pb-1 pt-0'
                  >
                    <span className='text-[#505050] text-[22px] md:text-[20px] leading-none'>‹</span>
                  </button>
                  <button
                    onClick={() => jumpDays('next')}
                    className='w-9 h-9 md:w-7 md:h-7 flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 rounded-md transition-colors touch-manipulation pb-1 pt-0'
                  >
                    <span className='text-[#505050] text-[22px] md:text-[20px] leading-none'>›</span>
                  </button>
                </div>
              </div>
            </div>

            <div className='relative'>
              <div
                ref={calendarScrollRef}
                onWheel={handleCalendarWheel}
                className='overflow-x-auto scrollbar-hide pb-2'
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className='flex gap-2 pb-4 min-w-max'>
                  {calendarDays.map((day) => {
                    const isSelected = day.index === selectedIndex;
                    const hasEvents = getEventsForDay(day.index, calendarDays).length > 0;
                    const isToday = day.isToday;

                    const weekdayColor = isSelected
                      ? 'text-white/80'
                      : isToday
                      ? 'text-[#4c75d1]'
                      : 'text-[#606060]';

                    const dateColor = isSelected
                      ? 'text-white'
                      : isToday
                      ? 'text-[#4c75d1]'
                      : 'text-[#202020]';

                    const stateClasses = isSelected
                      ? 'bg-[#4c75d1] text-white border-[#4c75d1] shadow-lg scale-100'
                      : isToday
                      ? 'bg-white text-[#202020] border-2 border-[#4c75d1] scale-100'
                      : 'bg-white text-[#202020] border border-neutral-200 hover:border-[#4c75d1] hover:bg-[#4c75d1]/5 scale-95';

                    return (
                      <button
                        key={day.fullDate.toISOString()}
                        onClick={() => handleDayClick(day.index)}
                        className={
                          'w-24 h-24 md:w-20 md:h-20 rounded-xl flex flex-col items-start justify-between p-3 md:p-2.5 transition-all duration-200 ease-out select-none touch-manipulation ' +
                          stateClasses
                        }
                      >
                        <span
                          className={`text-[11px] md:text-[10px] uppercase tracking-wider font-medium ${weekdayColor}`}
                        >
                          {day.weekday}
                        </span>
                        <div className='flex items-end justify-between w-full'>
                          <span
                            className={`text-2xl md:text-xl font-semibold tabular-nums ${dateColor}`}
                          >
                            {day.day}
                          </span>
                          {isToday && !isSelected && (
                            <span className='w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[#4c75d1]' />
                          )}
                          {!isToday && hasEvents && !isSelected && (
                            <span className='w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[#4c75d1]' />
                          )}
                          {hasEvents && isSelected && (
                            <span className='w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-white/80' />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gradient fades */}
              <div className='absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white/60 to-transparent pointer-events-none' />
              <div className='absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/60 to-transparent pointer-events-none' />
            </div>
          </div>
        </div>

        {/* Active/Upcoming card */}
        <div className='w-full flex flex-col min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:max-h-[calc(100vh-11rem)]'>
          <div className='flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col overflow-hidden max-h-[800px] lg:max-h-none'>
            {/* Active date events section */}
            <div className='flex flex-col flex-shrink-0' style={{ height: ACTIVE_EVENTS_HEIGHT }}>
              <div className='flex items-start justify-between gap-2 px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100'>
                <div className='flex flex-col'>
                  <span className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                    {selectedDay?.monthShort} {selectedDay?.day}, {selectedDay?.year}
                  </span>
                </div>
                <div className='text-right text-sm text-[#202020] tabular-nums'>
                  {eventsForDayData.length}
                  <span className='ml-1 text-xs text-[#505050]'>
                    {eventsForDayData.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </div>

              {calendarDataLoading ? (
                <div className='flex items-center justify-center flex-1'>
                  <div className='text-center'>
                    <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#4c75d1] border-r-transparent'></div>
                    <p className='mt-2 text-xs text-[#808080]'>Loading events...</p>
                  </div>
                </div>
              ) : eventsForDayData.length > 0 ? (
                <div className='flex-1 min-h-0 overflow-y-auto scrollbar-hide'>
                  {eventsForDayData.map((event, index) => (
                    <EventCard key={`${event.kind}-${(event as any)._internalId}`} event={event} showBorder={index > 0} workspaceId={currentWorkspace.id} />
                  ))}
                </div>
              ) : (
                <div className='flex items-center justify-center flex-1'>
                  <p className='text-sm text-[#808080]'>No events scheduled</p>
                </div>
              )}
            </div>

            {/* Divider between sections */}
            <div className='border-t border-neutral-200' />

            {/* Upcoming events section */}
            <div className='flex-1 flex flex-col overflow-hidden min-h-0'>
              <div className='flex items-center justify-between px-3 md:px-4 pt-3 pb-3 border-b border-neutral-100'>
                <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  Upcoming
                </h3>
                <AddEventPopover
                  workspaceId={currentWorkspace.id}
                  buttonClassName='inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-[#303030] hover:border-[#4c75d1]/70 hover:bg-[#4c75d1]/5 active:bg-[#4c75d1]/10 transition-colors touch-manipulation shadow-sm'
                />
              </div>

              <div className='flex-1 overflow-y-auto scrollbar-hide relative' ref={upcomingEventsScrollRef}>
              {calendarDataLoading ? (
                <div className='flex items-center justify-center h-full'>
                  <div className='text-center'>
                    <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#4c75d1] border-r-transparent'></div>
                    <p className='mt-2 text-xs text-[#808080]'>Loading events...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Sticky header */}
                  {stickyMonth && (
                    <div className='sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.55)] mb-1 px-3 md:px-4 py-2'>
                      <div className='text-[10px] uppercase tracking-wider text-[#2f3135] font-semibold'>
                        {stickyMonth}
                      </div>
                    </div>
                  )}

                  {eventsByMonth.map(([month, events], monthIndex) => {
                const isStickyMonth = month === stickyMonth;
                return (
                  <div key={month}>
                    <div
                      ref={(el) => {
                        if (el) monthRefs.current.set(month, el);
                      }}
                      data-month={month}
                      className={`px-3 md:px-4 ${isStickyMonth ? 'h-px mb-0 overflow-hidden' : 'pt-2 mb-3'}`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-wider text-[#606060] font-semibold ${isStickyMonth ? 'opacity-0 pointer-events-none h-px' : ''}`}
                      >
                        {month}
                      </div>
                    </div>
                    <div className='pb-3 md:pb-4'>
                      {events.map((item, eventIndex) => {
                        const showBorder = eventIndex > 0 || (monthIndex > 0 && eventIndex === 0);
                        return (
                          <UpcomingEventCard
                            key={`${item.kind}-${(item as any)._internalId}`}
                            item={item}
                            showBorder={showBorder}
                            workspaceId={currentWorkspace.id}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                </>
              )}
              </div>
            </div>
          </div>
        </div>

          {/* Activity + Recent files row */}
          <div className='flex flex-col md:flex-row gap-3 lg:gap-4 min-h-0 lg:col-start-1 lg:row-start-2 lg:h-full'>
            {/* Recent files */}
            <div className='flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 max-h-[400px] lg:max-h-none'>
              <div className='flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100'>
                <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  Recent files
                </h3>
              </div>

              {/* Table Header - Hidden on mobile */}
              <div className='hidden md:flex items-center gap-4 px-3 md:px-4 pt-2 pb-2 border-b border-neutral-200'>
                <div className='flex-[2] min-w-0'>
                  <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold text-left'>
                    File Name
                  </div>
                </div>
                <div className='flex items-center gap-4 md:shrink-0'>
                  <div className='w-32 shrink-0'>
                    <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold text-left'>
                      Folder
                    </div>
                  </div>
                  <div className='w-40 shrink-0'>
                    <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold text-left'>
                      Project
                    </div>
                  </div>
                  <div className='w-20 shrink-0'>
                    <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold text-left'>
                      Modified
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className='flex-1 overflow-y-auto scrollbar-hide'>
                {isLoadingFiles ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-[#4c75d1] border-t-transparent rounded-full animate-spin' />
                      <p className='text-sm text-[#808080]'>Loading files...</p>
                    </div>
                  </div>
                ) : recentFiles.length > 0 ? (
                  recentFiles.map((file, index) => (
                    <FileItem key={`${file.id}-${index}`} file={file} />
                  ))
                ) : (
                  <div className='flex items-center justify-center py-8'>
                    <p className='text-sm text-[#808080]'>No recent files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div className='md:w-96 lg:w-[400px] rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 max-h-[400px] lg:max-h-none'>
              <div className='flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100'>
                <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  Activity Feed
                </h3>
                <div className='text-[10px] text-[#808080]'>Last 14 days</div>
              </div>

              <div className='flex-1 overflow-y-auto scrollbar-hide'>
                {isLoadingActivity ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-[#4c75d1] border-t-transparent rounded-full animate-spin' />
                      <p className='text-sm text-[#808080]'>Loading activity...</p>
                    </div>
                  </div>
                ) : isActivityError ? (
                  <div className='flex flex-col items-center justify-center py-8 px-4'>
                    <p className='text-sm text-red-600 text-center'>Failed to load activity</p>
                    <button
                      onClick={() => window.location.reload()}
                      className='mt-2 text-xs text-[#4c75d1] hover:underline'
                    >
                      Retry
                    </button>
                  </div>
                ) : activityItems.length > 0 ? (
                  <>
                    {activityItems.map((item, index) => (
                      <ActivityItem
                        key={`${item.id}-${index}`}
                        icon={item.icon}
                        iconBg={item.iconBg}
                        title={item.title}
                        subtitle={item.subtitle}
                        time={item.time}
                        showBorder={index > 0}
                        isFirst={index === 0}
                        isLast={index === activityItems.length - 1}
                      />
                    ))}
                  </>
                ) : (
                  <div className='flex items-center justify-center py-8'>
                    <p className='text-sm text-[#808080]'>No activity in the last 14 days</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
