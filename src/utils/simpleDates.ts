export function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getDayOfWeek(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getFullFormattedDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isSameDay(dateA: string, dateB: string): boolean {
  return dateA === dateB;
}

// Check if a date string YYYY-MM-DD is within the current week (Sunday to Saturday)
export function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const target = new Date(dateStr + 'T00:00:00');
  
  // Start of week (Sunday)
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  // End of week (Saturday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return target >= start && target <= end;
}

// Check if a date string YYYY-MM-DD is in the current month
export function isThisMonth(dateStr: string): boolean {
  const now = new Date();
  const [y, m] = dateStr.split('-').map(Number);
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

export function formatFriendlyDate(dateStr: string): string {
  const today = getToday();
  if (dateStr === today) return 'Today';
  
  const d = new Date(dateStr + 'T00:00:00');
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = yest.toISOString().split('T')[0];
  if (dateStr === yestStr) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getCurrentTime24(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatTime24to12(timeStr?: string): string {
  if (!timeStr) return getCurrentTime();
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return getCurrentTime();
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return getCurrentTime();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minStr = String(minutes).padStart(2, '0');
  const hrStr = String(hours).padStart(2, '0');
  return `${hrStr}:${minStr} ${ampm}`;
}

export function formatTransactionDateTime(dateStr: string, timeStr?: string, dayStr?: string): {
  day: string;
  formattedDate: string;
  formattedTime: string;
  fullString: string;
} {
  const day = dayStr || getDayOfWeek(dateStr);
  const d = new Date(dateStr + 'T00:00:00');
  const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = timeStr || getCurrentTime();
  const isToday = dateStr === getToday();
  const dateLabel = isToday ? 'Today' : formattedDate;
  const fullString = `${day} • ${dateLabel} • ${formattedTime}`;
  return { day, formattedDate, formattedTime, fullString };
}

