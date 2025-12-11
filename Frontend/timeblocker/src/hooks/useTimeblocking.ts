import { useEffect, useState, useRef } from 'react';
import { DayInfo } from '@/types/block';

// Compute the "effective today" which rolls over at 4 AM
export function computeEffectiveToday(now: Date): Date {
  const eff = new Date(now);
  // if local time is before 4am, treat it as previous day
  if (now.getHours() < 4) eff.setDate(eff.getDate() - 1);
  eff.setHours(0, 0, 0, 0);
  return eff;
}

export function useEffectiveToday() {
  const [effectiveToday, setEffectiveToday] = useState<Date>(() => computeEffectiveToday(new Date()));

  useEffect(() => {
    const now = new Date();
    const next4 = new Date(now);
    next4.setHours(4, 0, 0, 0);
    if (next4 <= now) next4.setDate(next4.getDate() + 1);
    const ms = next4.getTime() - now.getTime();
    const t = window.setTimeout(() => {
      setEffectiveToday(computeEffectiveToday(new Date()));
    }, ms + 50); // slight buffer
    return () => window.clearTimeout(t);
  }, [effectiveToday]);

  return effectiveToday;
}

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return currentTime;
}

export function useDaysInfo(view: string, effectiveToday: Date): DayInfo[] {
  return view === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(effectiveToday);
        d.setDate(effectiveToday.getDate() + i);
        return {
          short: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase().slice(0, 3),
          num: d.getDate(),
          date: d,
        };
      })
    : Array.from({ length: 2 }, (_, i) => {
        const d = new Date(effectiveToday);
        d.setDate(effectiveToday.getDate() + i);
        return {
          short: i === 0 ? 'Today' : 'Tomorrow',
          num: d.getDate(),
          date: d,
        };
      });
}

export function useResponsiveTimeColumn(view: string, desktopWidth: number, mobileWidth: number) {
  const [timeColWidth, setTimeColWidth] = useState<number>(mobileWidth);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = (matches: boolean) => {
      const isDesktop = matches;
      const width = view === 'week' && !isDesktop ? mobileWidth : desktopWidth;
      setTimeColWidth(width);
    };
    
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(handler);
    }
    
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else if ((mq as any).removeListener) {
        (mq as any).removeListener(handler);
      }
    };
  }, [view, desktopWidth, mobileWidth]);

  return timeColWidth;
}

export function useGridLayout(
  containerRef: React.RefObject<HTMLDivElement | null>,
  daysCount: number,
  timeColWidth: number
) {
  const [cellWidth, setCellWidth] = useState(120);
  const [gridWidth, setGridWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const total = el.clientWidth;
      const days = Math.max(1, daysCount);
      const available = Math.max(0, total - timeColWidth);
      const cw = available / days;
      const clamped = Math.max(160, cw);
      setCellWidth(clamped);
      setGridWidth(clamped * days);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [containerRef, daysCount, timeColWidth]);

  return { cellWidth, gridWidth };
}
