import {
  daysInMonth,
  formatCalendarDate,
  type AgendaEvent,
  type AgendaResponse,
  type CalendarDate,
  type ImportantDateOccurrence,
} from '@vibru/shared';

export type AgendaEntry =
  | { kind: 'event'; key: string; date: CalendarDate; title: string; event: AgendaEvent }
  | {
      kind: 'date';
      key: string;
      date: CalendarDate;
      title: string;
      importantDate: ImportantDateOccurrence;
    }
  | { kind: 'anniversary'; key: string; date: CalendarDate; title: string };

export type AgendaDay = { date: CalendarDate; entries: AgendaEntry[] };

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function monthParts(month: string): { year: number; monthNumber: number } {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return { year, monthNumber };
}

export function monthLabel(month: string): string {
  const { year, monthNumber } = monthParts(month);
  return monthFormatter.format(new Date(Date.UTC(year, monthNumber - 1, 15)));
}

export function shiftMonth(month: string, delta: number): string {
  const { year, monthNumber } = monthParts(month);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/** Células da grade: `null` nos dias antes do dia 1, com a semana começando no domingo. */
export function monthGrid(month: string): (CalendarDate | null)[] {
  const { year, monthNumber } = monthParts(month);
  const leadingBlanks = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = Array.from({ length: daysInMonth(year, monthNumber) }, (_, index) =>
    formatCalendarDate({ year, month: monthNumber, day: index + 1 }),
  );

  return [...Array.from({ length: leadingBlanks }, () => null), ...days];
}

function buildEntries(agenda: AgendaResponse): AgendaEntry[] {
  return [
    ...agenda.anniversaries.map((anniversary): AgendaEntry => ({
      kind: 'anniversary',
      key: `${anniversary.kind}-${anniversary.date}`,
      date: anniversary.date,
      title: anniversary.title,
    })),
    ...agenda.importantDates.map((importantDate): AgendaEntry => ({
      kind: 'date',
      key: `date-${importantDate.id}`,
      date: importantDate.date,
      title: importantDate.title,
      importantDate,
    })),
    ...agenda.events.map((event): AgendaEntry => ({
      kind: 'event',
      key: `event-${event.id}`,
      date: event.startsOn,
      title: event.startTime ? `${event.startTime} · ${event.title}` : event.title,
      event,
    })),
  ];
}

/** Só os dias com algo marcado, em ordem; dentro do dia, datas antes dos eventos. */
export function agendaDays(agenda: AgendaResponse): AgendaDay[] {
  const days = new Map<CalendarDate, AgendaEntry[]>();

  for (const entry of buildEntries(agenda)) {
    days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  }

  return [...days.entries()]
    .map(([date, entries]) => ({ date, entries }))
    .sort((left, right) => left.date.localeCompare(right.date));
}
