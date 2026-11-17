import { describe, expect, it } from 'vitest';
import { countdown, monthCells, nextSaturday } from './saturdays';

describe('nextSaturday', () => {
  it('is the same day on a Saturday and the coming one otherwise', () => {
    expect(nextSaturday(new Date(2026, 10, 14)).getDate()).toBe(14);
    expect(nextSaturday(new Date(2026, 10, 16)).getDate()).toBe(21);
    expect(nextSaturday(new Date(2026, 10, 15)).getDate()).toBe(21);
  });
});

describe('monthCells', () => {
  const today = new Date(2026, 10, 16);
  const cells = monthCells(
    2026,
    10,
    [new Date(2026, 10, 7), new Date(2026, 10, 14)],
    today,
  );

  it('starts on Monday and is a whole number of weeks', () => {
    // 1 Nov 2026 is a Sunday: six empty cells before it
    expect(cells.findIndex(c => c.d === 1)).toBe(6);
    expect(cells.length % 7).toBe(0);
  });

  it('marks played, next and planned Saturdays', () => {
    const kind = (d: number) => cells.find(c => c.d === d)?.kind;
    expect(kind(7)).toBe('played');
    expect(kind(14)).toBe('played');
    expect(kind(21)).toBe('next');
    expect(kind(28)).toBe('planned');
    expect(kind(10)).toBeUndefined();
  });

  it('marks today', () => {
    expect(cells.find(c => c.today)?.d).toBe(16);
  });
});

describe('countdown', () => {
  it('splits the time and never goes below zero', () => {
    const now = new Date(2026, 10, 16, 8, 0);
    expect(countdown(new Date(2026, 10, 21, 10, 30), now)).toEqual({
      days: 5,
      hours: 2,
      minutes: 30,
    });
    expect(countdown(now, new Date(2026, 10, 17))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });
});
