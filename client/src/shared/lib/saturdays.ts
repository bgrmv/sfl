import {
  addDays,
  endOfMonth,
  getDay,
  getDaysInMonth,
  isSameDay,
  startOfMonth,
} from 'date-fns';

/** The league plays every Saturday (GLOSSARY); there is no separate schedule. */
export const nextSaturday = (from: Date): Date => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const ahead = (6 - getDay(d) + 7) % 7;
  return addDays(d, ahead);
};

export interface MonthCell {
  d: number | null;
  kind?: 'played' | 'next' | 'planned';
  today?: boolean;
}

/**
 * Cells of a month grid, Monday first. Saturdays are `played` (a game exists),
 * `next` (the next Saturday), or `planned` (a later Saturday).
 */
export function monthCells(
  year: number,
  month: number,
  played: readonly Date[],
  today: Date,
): MonthCell[] {
  const first = startOfMonth(new Date(year, month, 1));
  const lead = (getDay(first) + 6) % 7;
  const next = nextSaturday(today);
  const cells: MonthCell[] = Array.from({ length: lead }, () => ({ d: null }));
  for (let day = 1; day <= getDaysInMonth(first); day++) {
    const date = new Date(year, month, day);
    const isSat = getDay(date) === 6;
    const kind = !isSat
      ? undefined
      : played.some(p => isSameDay(p, date))
        ? ('played' as const)
        : isSameDay(date, next)
          ? ('next' as const)
          : date > today
            ? ('planned' as const)
            : undefined;
    cells.push({ d: day, kind, today: isSameDay(date, today) });
  }
  while (cells.length % 7) {
    cells.push({ d: null });
  }
  return cells;
}

/** Days, hours and minutes to a moment; zero when it has passed. */
export function countdown(to: Date, now: Date) {
  const ms = Math.max(0, to.getTime() - now.getTime());
  const min = Math.floor(ms / 60000);
  return {
    days: Math.floor(min / 1440),
    hours: Math.floor((min % 1440) / 60),
    minutes: min % 60,
  };
}

export const monthEnd = endOfMonth;
