import type { CalendarDate } from '@vibru/shared';

const longDateWithWeekday = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * `CalendarDate` não tem fuso. O meio-dia em UTC evita que o `Intl` mostre o
 * dia anterior em fusos negativos.
 */
function noonUtc(calendarDate: CalendarDate): Date {
  return new Date(`${calendarDate}T12:00:00Z`);
}

export function formatLongDate(calendarDate: CalendarDate): string {
  return longDateWithWeekday.format(noonUtc(calendarDate));
}

export function formatSinceDate(calendarDate: CalendarDate): string {
  return fullDate.format(noonUtc(calendarDate));
}

export function daysUntilLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'hoje!';
  if (daysUntil === 1) return 'em 1 dia';
  return `em ${daysUntil} dias`;
}

export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function yearsLabel(years: number): string {
  return countLabel(years, 'ano', 'anos');
}
