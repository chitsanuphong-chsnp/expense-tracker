import {describe,it,expect} from 'vitest';
import {calendarDays,moveMonth,validDate} from '../apps/app/src/calendar-data';

describe('date-only calendar',()=>{
  it('rejects rollover dates instead of silently recording the next month',()=>{
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2025-02-29')).toBe(false);
    expect(validDate('2026-04-31')).toBe(false);
    expect(validDate('2026-13-01')).toBe(false);
    expect(validDate('2026-1-01')).toBe(false);
  });
  it('moves across December and leap February without overflowing a selected day',()=>{
    expect(moveMonth('2026-12',1)).toBe('2027-01');
    expect(moveMonth('2026-01',-1)).toBe('2025-12');
    expect(moveMonth('2024-01',1)).toBe('2024-02');
  });
  it('renders Monday-first weeks, leap day and adjacent month cells',()=>{
    const feb=calendarDays('2024-02');
    expect(feb[0].value).toBe('2024-01-29');
    expect(feb.at(-1)?.value).toBe('2024-03-03');
    expect(feb.filter(d=>d.inMonth)).toHaveLength(29);
    expect(feb.find(d=>d.value==='2024-02-29')?.day).toBe(29);
    expect(new Set(feb.map(d=>d.value)).size).toBe(feb.length);
  });
  it('fits a month requiring six weeks and preserves ISO dates under device timezones',()=>{
    const march=calendarDays('2026-03');
    expect(march).toHaveLength(42);
    expect(march[0].value).toBe('2026-02-23');
    expect(march.at(-1)?.value).toBe('2026-04-05');
    expect(march.every(d=>validDate(d.value))).toBe(true);
  });
});
