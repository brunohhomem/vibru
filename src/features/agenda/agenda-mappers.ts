import type { AgendaEventRow, ImportantDateRow } from '@/db/agenda-schema';
import type { AgendaEvent, ImportantDate } from './agenda-schemas';

const TIME_WITHOUT_SECONDS_LENGTH = 5;

export function toAgendaEvent(row: AgendaEventRow): AgendaEvent {
  return {
    id: row.id,
    title: row.title,
    startsOn: row.startsOn,
    // O Postgres devolve HH:MM:SS; o contrato é HH:MM.
    startTime: row.startTime ? row.startTime.slice(0, TIME_WITHOUT_SECONDS_LENGTH) : null,
    notes: row.notes,
    wishId: row.wishId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toImportantDate(row: ImportantDateRow): ImportantDate {
  return {
    id: row.id,
    title: row.title,
    occursOn: row.occursOn,
    repeatsYearly: row.repeatsYearly,
    createdAt: row.createdAt.toISOString(),
  };
}
