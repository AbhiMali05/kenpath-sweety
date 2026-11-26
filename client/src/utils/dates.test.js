import { describe, expect, it } from 'vitest';
import { formatCalendarDate, getLocalDateString } from './dates.js';

describe('calendar date helpers', () => {
  it('formats the local calendar date without converting through UTC', () => {
    const date = new Date(2026, 0, 8, 23, 45);
    expect(getLocalDateString(date)).toBe('2026-01-08');
  });

  it('formats date-only values deterministically and leaves invalid values alone', () => {
    const date = new Date('2026-01-08T00:00:00.000Z');
    const expected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(date);
    expect(formatCalendarDate('2026-01-08')).toBe(expected);
    expect(formatCalendarDate('not-a-date')).toBe('not-a-date');
  });
});
