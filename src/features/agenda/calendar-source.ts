import { findCoupleById } from '@/features/couple/couple-repository';
import { buildCalendarEntries, type CalendarEntries, type DateRange } from './agenda-entries';
import { listEventsBetween } from './agenda-repository';
import { listImportantDates } from './important-dates-repository';

/** Fonte única do calendário do casal: a tela do mês, a próxima data e o feed ICS usam esta. */
export async function loadCalendarEntries(
  coupleId: string,
  range: DateRange,
): Promise<CalendarEntries> {
  const [couple, events, importantDates] = await Promise.all([
    findCoupleById(coupleId),
    listEventsBetween(coupleId, range.from, range.to),
    listImportantDates(coupleId),
  ]);
  if (!couple) throw new Error('Couple not found for the agenda');

  return buildCalendarEntries({ couple, events, importantDates }, range);
}
