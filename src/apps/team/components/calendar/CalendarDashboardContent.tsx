import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { CalendarDay } from '../../types';
import {
  generateCalendarDays,
  getCurrentDate,
  getCurrentDateShort,
  getInitialCalendar
} from '../../utils';
import {
  EVENTS,
  UPCOMING_EVENTS,
  RECENT_FILES,
  ACTIVITY_ITEMS
} from '../../constants';
import { EventCard } from './EventCard';
import { UpcomingEventCard } from './UpcomingEventCard';
import { ActivityItem } from './ActivityItem';
import { FileItem } from './FileItem';

const INITIAL_CALENDAR = getInitialCalendar();

export const CalendarDashboardContent: React.FC = () => {
  const { user } = useUser();
  const [mdUp, setMdUp] = useState(true);
  const [currentYear, setCurrentYear] = useState(INITIAL_CALENDAR.year);
  const [currentMonth, setCurrentMonth] = useState(INITIAL_CALENDAR.month);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>(INITIAL_CALENDAR.days);
  const [selectedIndex, setSelectedIndex] = useState(INITIAL_CALENDAR.selectedIndex);
  const [visibleIndex, setVisibleIndex] = useState(INITIAL_CALENDAR.selectedIndex);

  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const checkSize = () => setMdUp(window.innerWidth >= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Scroll to today on mount - center the card
  useEffect(() => {
    if (calendarScrollRef.current && selectedIndex > 0) {
      isProgrammaticScroll.current = true;
      const scrollContainer = calendarScrollRef.current;
      const cardWidth = mdUp ? 88 : 104;
      const viewportWidth = scrollContainer.clientWidth;

      const scrollPosition = (selectedIndex * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

      setTimeout(() => {
        scrollContainer.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 600);
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll to update visible month
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

        if (newIndex !== visibleIndex) {
          setVisibleIndex(newIndex);
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [visibleIndex, calendarDays.length, mdUp]);

  // Handle wheel scroll for horizontal scrolling
  const handleCalendarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (calendarScrollRef.current) {
      e.preventDefault();
      calendarScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Month navigation
  const goToMonth = (direction: 'prev' | 'next') => {
    let newMonth = currentMonth + (direction === 'next' ? 1 : -1);
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    const newDays = generateCalendarDays(newYear, newMonth, 60);
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    setCalendarDays(newDays);
    setSelectedIndex(0);
    setVisibleIndex(0);

    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Reset calendar to today
  const resetToToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const newDays = generateCalendarDays(year, month, 60);
    const todayIdx = newDays.findIndex(day => day.isToday);

    setCurrentYear(year);
    setCurrentMonth(month);
    setCalendarDays(newDays);

    if (todayIdx >= 0) {
      setSelectedIndex(todayIdx);
      setVisibleIndex(todayIdx);

      setTimeout(() => {
        if (calendarScrollRef.current) {
          isProgrammaticScroll.current = true;
          const scrollContainer = calendarScrollRef.current;
          const cardWidth = mdUp ? 88 : 104;
          const viewportWidth = scrollContainer.clientWidth;

          const scrollPosition = (todayIdx * cardWidth) - (viewportWidth / 2) + (cardWidth / 2);

          scrollContainer.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });

          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 600);
        }
      }, 100);
    }
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

  // Visible month label
  const getVisibleMonth = () => {
    const day = calendarDays[visibleIndex] || calendarDays[0];
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

  const selectedDay = calendarDays[selectedIndex] || calendarDays[0];
  const eventsForDay = EVENTS[selectedIndex] || [];
  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <div className='flex-1 flex flex-col min-h-0 px-3 md:px-6 pt-4 md:pt-6 pb-4 gap-3 md:gap-4 overflow-y-auto'>
        {/* Welcome section */}
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-1 px-3 md:px-4'>
            <div className='text-xl md:text-[26px] leading-tight font-semibold text-[#202020]'>
              {getGreeting()}, {userName}
            </div>
          </div>
        </div>

        {/* Calendar section */}
        <div className='flex-1 flex flex-col lg:flex-row min-h-0 gap-4 lg:gap-6'>
        {/* Left section - Calendar grid + Activity/Files */}
        <div className='flex-1 flex flex-col min-w-0 gap-4'>
          {/* Calendar scroll area */}
          <div className='rounded-xl bg-white/60 px-3 md:px-4 py-3 md:py-4 shrink-0'>
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
                <div className='text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-[#606060]'>
                  {getVisibleMonth()}
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => goToMonth('prev')}
                    className='w-9 h-9 md:w-7 md:h-7 flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 rounded-md transition-colors touch-manipulation'
                  >
                    <span className='text-[#505050] text-lg md:text-base'>‹</span>
                  </button>
                  <button
                    onClick={() => goToMonth('next')}
                    className='w-9 h-9 md:w-7 md:h-7 flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 rounded-md transition-colors touch-manipulation'
                  >
                    <span className='text-[#505050] text-lg md:text-base'>›</span>
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
                    const hasEvents = !!EVENTS[day.index];
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

          {/* Activity + Recent files row */}
          <div className='flex-1 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0'>
            {/* Activity Feed */}
            <div className='md:w-80 rounded-xl border border-neutral-200 bg-white/60 py-3 flex flex-col min-w-0 max-h-[400px] md:max-h-none'>
              <div className='flex items-center justify-between mb-3 px-3 md:px-4'>
                <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  Activity Feed
                </h3>
              </div>

              <div className='flex-1 overflow-y-auto scrollbar-hide'>
                {ACTIVITY_ITEMS.map((item) => (
                  <ActivityItem
                    key={item.id}
                    icon={item.icon}
                    iconBg={item.iconBg}
                    title={item.title}
                    subtitle={item.subtitle}
                    time={item.time}
                  />
                ))}
              </div>
            </div>

            {/* Recent files */}
            <div className='flex-1 rounded-xl border border-neutral-200 bg-white/60 py-3 flex flex-col min-w-0 max-h-[400px] md:max-h-none'>
              <div className='flex items-center justify-between mb-3 px-3 md:px-4'>
                <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  Recent files
                </h3>
              </div>

              {/* Table Header - Hidden on mobile */}
              <div className='hidden md:flex items-center gap-4 px-3 md:px-4 pb-2 border-b border-neutral-200'>
                <div className='flex-1 min-w-0'>
                  <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold'>
                    File Name
                  </div>
                </div>
                <div className='w-20 shrink-0'>
                  <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold'>
                    Project
                  </div>
                </div>
                <div className='w-24 shrink-0'>
                  <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold'>
                    Author
                  </div>
                </div>
                <div className='w-20 shrink-0'>
                  <div className='text-[10px] uppercase tracking-wider text-[#808080] font-semibold'>
                    Modified
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className='flex-1 overflow-y-auto scrollbar-hide'>
                {RECENT_FILES.map((file) => (
                  <FileItem key={file.id} file={file} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right section - Active date + Upcoming events */}
        <div className='w-full lg:w-80 lg:shrink-0 flex flex-col lg:min-h-0 gap-3 md:gap-4'>
          {/* Active date events */}
          <div className='lg:h-1/3 min-h-[250px] lg:min-h-0 rounded-xl border border-neutral-200 bg-white/60 flex flex-col overflow-hidden'>
            <div className='flex items-start justify-between gap-2 mb-3 px-3 md:px-4 pt-3 md:pt-4'>
              <div className='flex flex-col'>
                <span className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                  {selectedDay?.monthShort} {selectedDay?.day}, {selectedDay?.year}
                </span>
              </div>
              <div className='text-right text-sm text-[#202020] tabular-nums'>
                {eventsForDay.length}
                <span className='ml-1 text-xs text-[#505050]'>
                  {eventsForDay.length === 1 ? 'event' : 'events'}
                </span>
              </div>
            </div>

            {eventsForDay.length > 0 ? (
              <div className='flex-1 overflow-y-auto scrollbar-hide'>
                {eventsForDay.map((event, index) => (
                  <EventCard key={event.id} event={event} showBorder={index > 0} />
                ))}
              </div>
            ) : (
              <div className='flex-1 flex items-center justify-center'>
                <p className='text-sm text-[#808080]'>No events scheduled</p>
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className='flex-1 min-h-[300px] lg:min-h-0 rounded-xl border border-neutral-200 bg-white/60 flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between mb-4 px-3 md:px-4 pt-3 md:pt-4'>
              <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
                Upcoming
              </h3>
              <button className='inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-[#303030] hover:border-green-500/70 hover:bg-green-50/80 transition-colors'>
                <span className='text-sm leading-none'>+</span>
                <span>Add event</span>
              </button>
            </div>

            <div className='flex-1 overflow-y-auto scrollbar-hide'>
              {UPCOMING_EVENTS.length > 0 && (
                <>
                  <div className='text-[10px] uppercase tracking-wider text-[#606060] font-semibold mb-3 px-3 md:px-4'>
                    {UPCOMING_EVENTS[0].month}
                  </div>
                  <div className='pb-3 md:pb-4'>
                    {UPCOMING_EVENTS.map((item, index) => (
                      <UpcomingEventCard
                        key={item.id}
                        item={item}
                        showBorder={index > 0}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
