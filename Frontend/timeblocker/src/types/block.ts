export type Block = {
  id: string;
  day: number; // 0..6
  startTime: number; // hour with decimal (e.g., 9.5 for 9:30 AM)
  endTime: number; // hour with decimal
  title?: string;
  description?: string;
  color?: string;
};

export type DayInfo = {
  short: string;
  num: number;
  date: Date;
};
