import { CalendarDay } from '../types/calendar';

// Helper to check if two dates are the same day
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Generate calendar days centered around a specific date (31 days: 15 before, date, 15 after)
export function generateCalendarDays(
  year: number,
  month: number,
  day: number
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start date is 15 days before the target date
  const centerDate = new Date(year, month, day);
  const startDate = new Date(centerDate);
  startDate.setDate(centerDate.getDate() - 15);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate 31 days total
  for (let i = 0; i < 31; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    days.push({
      index: i,
      day: currentDate.getDate(),
      monthShort: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      weekday: dayNames[currentDate.getDay()],
      fullDate: new Date(currentDate),
      isToday: isSameDay(currentDate, today),
    });
  }

  return days;
}

// Dynamic greeting based on time of day
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

// Current date formatted
export const getCurrentDate = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  return now.toLocaleDateString('en-US', options);
};

// Abbreviated date for mobile
export const getCurrentDateShort = () => {
  const now = new Date();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
};

// Initial calendar state (based on today, 15 days before and 15 days after)
export const getInitialCalendar = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const days = generateCalendarDays(year, month, day);
  // Today will always be at index 15 (middle of 31 days)
  const idx = days.findIndex((d) => d.isToday);
  return {
    year,
    month,
    day,
    days,
    selectedIndex: idx === -1 ? 15 : idx,
  };
};
