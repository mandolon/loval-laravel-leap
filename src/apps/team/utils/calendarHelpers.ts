import { CalendarDay } from '../types/calendar';

// Helper to check if two dates are the same day
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Generate calendar days for a given month/year (60-day window)
export function generateCalendarDays(
  year: number,
  month: number,
  numDays: number = 60
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(year, month, 1);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < numDays; i++) {
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

// Initial calendar state (based on today)
export const getInitialCalendar = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = generateCalendarDays(year, month, 60);
  const idx = days.findIndex((d) => d.isToday);
  return {
    year,
    month,
    days,
    selectedIndex: idx === -1 ? 0 : idx,
  };
};
