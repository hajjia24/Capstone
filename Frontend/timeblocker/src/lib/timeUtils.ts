export function hourRange(start = 7, end = 20) {
  const arr: number[] = [];
  for (let h = start; h <= end; h++) arr.push(h);
  return arr;
}

export function formatHour(h: number) {
  const h24 = h % 24;
  if (h24 === 0) return '12 AM';
  if (h24 === 12) return '12 PM';
  if (h24 > 12) return `${h24 - 12} PM`;
  return `${h24} AM`;
}

// Convert decimal hour to HH:MM format
export function decimalToTime(decimal: number): string {
  const h24 = Math.floor(decimal) % 24;
  const minutes = Math.round((decimal % 1) * 60);
  return `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Convert HH:MM to decimal hour (supports 24+ hours for next-day times)
export function timeToDecimal(timeStr: string, allowNextDay = false): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes >= 60) return null;
  let decimal = hours + minutes / 60;
  // If allowNextDay and hours < 4, treat as next day (add 24)
  if (allowNextDay && hours < 4 && decimal < 4) {
    decimal += 24;
  }
  return decimal;
}

export function formatCurrentTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
