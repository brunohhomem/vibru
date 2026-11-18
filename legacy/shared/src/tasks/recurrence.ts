import {
  daysInMonth,
  formatCalendarDate,
  parseCalendarDate,
  type CalendarDate,
} from '../couple/calendar-date';

export const TASK_RECURRENCE_KINDS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;

export type TaskRecurrenceKind = (typeof TASK_RECURRENCE_KINDS)[number];

const DAYS_PER_WEEK = 7;

/**
 * Soma `steps` ocorrências à âncora. Mensal e anual mantêm o dia da âncora e
 * caem no último dia do mês quando ele é mais curto (31/01 → 28/02 → 31/03).
 * 29/02 anual vira 28/02 nos anos não bissextos (ADR 0003, seção 3).
 */
export function addRecurrence(
  anchor: CalendarDate,
  kind: TaskRecurrenceKind,
  interval: number,
  steps: number,
): CalendarDate {
  const parts = parseCalendarDate(anchor);

  if (kind === 'none') return anchor;

  if (kind === 'daily' || kind === 'weekly') {
    const dayStep = kind === 'daily' ? 1 : DAYS_PER_WEEK;
    return addCalendarDays(anchor, steps * interval * dayStep);
  }

  const monthStep = kind === 'monthly' ? 1 : 12;
  return addCalendarMonths(parts.year, parts.month, parts.day, steps * interval * monthStep);
}

/**
 * Primeira ocorrência estritamente posterior a `after`. A busca parte do mês
 * (ou dia) de `after` e avança até passar dele; assim o clamp de fim de mês
 * nunca devolve uma ocorrência que já ficou para trás.
 */
export function nextRecurrence(
  anchor: CalendarDate,
  kind: TaskRecurrenceKind,
  interval: number,
  after: CalendarDate,
): CalendarDate {
  if (kind === 'none') return anchor;
  if (anchor > after) return anchor;

  if (kind === 'daily' || kind === 'weekly') {
    const dayStep = (kind === 'daily' ? 1 : DAYS_PER_WEEK) * interval;
    const elapsedDays = daysBetweenUtc(anchor, after);
    const steps = Math.floor(elapsedDays / dayStep) + 1;
    return addCalendarDays(anchor, steps * dayStep);
  }

  const monthStep = (kind === 'monthly' ? 1 : 12) * interval;
  const anchorParts = parseCalendarDate(anchor);
  const afterParts = parseCalendarDate(after);
  const elapsedMonths =
    (afterParts.year - anchorParts.year) * 12 + (afterParts.month - anchorParts.month);

  let steps = Math.max(0, Math.floor(elapsedMonths / monthStep));
  let candidate = addRecurrence(anchor, kind, interval, steps);

  while (candidate <= after) {
    steps += 1;
    candidate = addRecurrence(anchor, kind, interval, steps);
  }

  return candidate;
}

/** Segunda-feira da semana de `today` (semana de segunda a domingo). */
export function startOfWeek(today: CalendarDate): CalendarDate {
  const { year, month, day } = parseCalendarDate(today);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % DAYS_PER_WEEK;
  return addCalendarDays(today, -daysSinceMonday);
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const { year, month, day } = parseCalendarDate(date);
  const utc = new Date(Date.UTC(year, month - 1, day + days));

  return formatCalendarDate({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  });
}

function addCalendarMonths(year: number, month: number, day: number, months: number): CalendarDate {
  const monthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));

  return formatCalendarDate({ year: targetYear, month: targetMonth, day: targetDay });
}

function daysBetweenUtc(from: CalendarDate, to: CalendarDate): number {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);

  return Math.round((endUtc - startUtc) / 86_400_000);
}
