import {
  addDays,
  annualOccurrenceInYear,
  bodasName,
  daysBetween,
  daysInMonth,
  parseCalendarDate,
  type CalendarDate,
} from '@vibru/shared';
import type { AgendaEventRow, ImportantDateRow } from '@/db/agenda-schema';
import { toAgendaEvent, toImportantDate } from './agenda-mappers';
import type {
  AgendaAnniversary,
  AgendaEvent,
  AgendaUpcomingItem,
  AgendaUpcomingResponse,
  ImportantDateOccurrence,
} from './agenda-schemas';

export type DateRange = { from: CalendarDate; to: CalendarDate };
type AnnualOccurrence = { date: CalendarDate; years: number };

export type CalendarEntries = {
  events: AgendaEvent[];
  importantDates: ImportantDateOccurrence[];
  anniversaries: AgendaAnniversary[];
};

const UPCOMING_WINDOW_DAYS = 365;
const MONTH_DAY_PAD = 2;

export function monthRange(month: string): DateRange {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return {
    from: `${month}-01`,
    to: `${month}-${String(daysInMonth(year, monthNumber)).padStart(MONTH_DAY_PAD, '0')}`,
  };
}

/** Ocorrências anuais de uma data dentro do intervalo, com os anos desde a origem. */
export function annualOccurrences(origin: CalendarDate, range: DateRange): AnnualOccurrence[] {
  const originYear = parseCalendarDate(origin).year;
  const firstYear = Math.max(parseCalendarDate(range.from).year, originYear);
  const lastYear = parseCalendarDate(range.to).year;
  const occurrences: AnnualOccurrence[] = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    const date = annualOccurrenceInYear(origin, year);
    if (date >= range.from && date <= range.to) {
      occurrences.push({ date, years: year - originYear });
    }
  }

  return occurrences;
}

export function importantDateOccurrences(
  row: ImportantDateRow,
  range: DateRange,
): ImportantDateOccurrence[] {
  const item = toImportantDate(row);

  if (row.repeatsYearly) {
    return annualOccurrences(row.occursOn, range).map(({ date }) => ({ ...item, date }));
  }

  const isInRange = row.occursOn >= range.from && row.occursOn <= range.to;
  return isInRange ? [{ ...item, date: row.occursOn }] : [];
}

function yearsLabel(years: number): string {
  return years === 1 ? '1 ano' : `${years} anos`;
}

function weddingTitle(years: number): string {
  const name = bodasName(years);
  if (!name) return `${yearsLabel(years)} de casamento`;
  return `Bodas de ${name} (${yearsLabel(years)})`;
}

/** Bodas e namoro: só a partir de 1 ano completo. */
export function buildAnniversaries(
  origin: CalendarDate | null,
  range: DateRange,
  kind: AgendaAnniversary['kind'],
): AgendaAnniversary[] {
  if (!origin) return [];

  return annualOccurrences(origin, range)
    .filter((occurrence) => occurrence.years >= 1)
    .map(({ date, years }) => ({
      kind,
      date,
      years,
      title: kind === 'wedding' ? weddingTitle(years) : `${yearsLabel(years)} de namoro`,
    }));
}

function byDate(left: { date: CalendarDate }, right: { date: CalendarDate }): number {
  return left.date.localeCompare(right.date);
}

/** Reúne o que aparece no calendário do casal; a tela do mês e o feed ICS usam a mesma fonte. */
export function buildCalendarEntries(
  input: {
    couple: { marriedOn: CalendarDate | null; datingStartedOn: CalendarDate | null };
    events: AgendaEventRow[];
    importantDates: ImportantDateRow[];
  },
  range: DateRange,
): CalendarEntries {
  return {
    events: input.events.map(toAgendaEvent),
    importantDates: input.importantDates
      .flatMap((row) => importantDateOccurrences(row, range))
      .sort(byDate),
    anniversaries: [
      ...buildAnniversaries(input.couple.marriedOn, range, 'wedding'),
      ...buildAnniversaries(input.couple.datingStartedOn, range, 'dating'),
    ].sort(byDate),
  };
}

/** No mesmo dia, a data do casal vem antes da data importante, que vem antes do evento. */
function sameDayPriority(kind: AgendaUpcomingItem['kind']): number {
  switch (kind) {
    case 'wedding':
      return 0;
    case 'dating':
      return 1;
    case 'important_date':
      return 2;
    case 'event':
      return 3;
  }
}

type UpcomingCandidate = AgendaUpcomingItem & { startTime: string | null };

function upcomingCandidates(entries: CalendarEntries, today: CalendarDate): UpcomingCandidate[] {
  const candidate = (
    kind: AgendaUpcomingItem['kind'],
    date: CalendarDate,
    title: string,
    startTime: string | null = null,
  ): UpcomingCandidate => ({ kind, date, title, daysUntil: daysBetween(today, date), startTime });

  return [
    ...entries.anniversaries.map((item) => candidate(item.kind, item.date, item.title)),
    ...entries.importantDates.map((item) => candidate('important_date', item.date, item.title)),
    ...entries.events.map((item) => candidate('event', item.startsOn, item.title, item.startTime)),
  ];
}

/** Evento sem horário vale o dia todo, então vem antes do evento com horário. */
function bySoonest(left: UpcomingCandidate, right: UpcomingCandidate): number {
  return (
    left.date.localeCompare(right.date) ||
    sameDayPriority(left.kind) - sameDayPriority(right.kind) ||
    (left.startTime ?? '').localeCompare(right.startTime ?? '')
  );
}

export function upcomingRange(today: CalendarDate): DateRange {
  return { from: today, to: addDays(today, UPCOMING_WINDOW_DAYS) };
}

/** A data mais próxima na janela de 365 dias, para o bloco "Próxima data" da home. */
export function pickUpcoming(
  entries: CalendarEntries,
  today: CalendarDate,
): AgendaUpcomingResponse['next'] {
  const soonest = upcomingCandidates(entries, today).sort(bySoonest)[0];
  if (!soonest) return null;

  const { kind, date, title, daysUntil } = soonest;
  return { kind, date, title, daysUntil };
}
