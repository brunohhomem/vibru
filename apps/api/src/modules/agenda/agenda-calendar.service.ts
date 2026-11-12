import { Injectable } from '@nestjs/common';
import {
  annualOccurrenceInYear,
  bodasName,
  daysInMonth,
  parseCalendarDate,
  todayInSaoPaulo,
  type AgendaAnniversary,
  type AgendaEvent,
  type AgendaResponse,
  type CalendarDate,
  type ImportantDateOccurrence,
} from '@vibru/shared';
import { CoupleRepository } from '../couple/couple.repository';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { AgendaEventsRepository } from './agenda-events.repository';
import { toAgendaEvent, toImportantDate } from './agenda.mappers';
import type { ImportantDateRow } from './agenda.entity';
import { ImportantDatesRepository } from './important-dates.repository';

type DateRange = { from: CalendarDate; to: CalendarDate };
type AnnualOccurrence = { date: CalendarDate; years: number };

export type CalendarEntries = {
  events: AgendaEvent[];
  importantDates: ImportantDateOccurrence[];
  anniversaries: AgendaAnniversary[];
};

function annualOccurrences(origin: CalendarDate, range: DateRange): AnnualOccurrence[] {
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

function importantDateOccurrences(
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

function anniversaries(
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
@Injectable()
export class AgendaCalendarService {
  constructor(
    private readonly coupleRepository: CoupleRepository,
    private readonly eventsRepository: AgendaEventsRepository,
    private readonly importantDatesRepository: ImportantDatesRepository,
  ) {}

  async getMonth(member: CurrentMemberContext, month: string): Promise<AgendaResponse> {
    const [year, monthNumber] = month.split('-').map(Number) as [number, number];
    const range = {
      from: `${month}-01`,
      to: `${month}-${String(daysInMonth(year, monthNumber)).padStart(2, '0')}`,
    };

    return {
      month,
      today: todayInSaoPaulo(new Date()),
      ...(await this.listBetween(member.coupleId, range)),
    };
  }

  async listBetween(coupleId: string, range: DateRange): Promise<CalendarEntries> {
    const [couple, events, dates] = await Promise.all([
      this.coupleRepository.findById(coupleId),
      this.eventsRepository.listBetween(coupleId, range.from, range.to),
      this.importantDatesRepository.listByCouple(coupleId),
    ]);
    if (!couple) throw new Error('Couple not found for the agenda');

    return {
      events: events.map(toAgendaEvent),
      importantDates: dates.flatMap((row) => importantDateOccurrences(row, range)).sort(byDate),
      anniversaries: [
        ...anniversaries(couple.marriedOn, range, 'wedding'),
        ...anniversaries(couple.datingStartedOn, range, 'dating'),
      ].sort(byDate),
    };
  }
}
