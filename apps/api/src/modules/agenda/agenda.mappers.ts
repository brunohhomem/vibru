import type { AgendaEvent, ImportantDate } from '@vibru/shared';
import type { AgendaEventRow, ImportantDateRow } from './agenda.entity';

export function toAgendaEvent(row: AgendaEventRow): AgendaEvent {
  return {
    id: row.id,
    title: row.title,
    startsOn: row.startsOn,
    // O Postgres devolve HH:MM:SS; o contrato é HH:MM.
    startTime: row.startTime ? row.startTime.slice(0, 5) : null,
    notes: row.notes,
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
