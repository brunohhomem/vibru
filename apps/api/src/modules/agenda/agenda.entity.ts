import { boolean, date, index, pgTable, text, time, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { couples } from '../couple/couple.entity';

function coupleColumn() {
  return uuid('couple_id')
    .notNull()
    .references(() => couples.id, { onDelete: 'cascade' });
}

export const agendaEvents = pgTable(
  'events',
  {
    ...coreColumns,
    coupleId: coupleColumn(),
    title: text('title').notNull(),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    startTime: time('start_time'),
    notes: text('notes'),
  },
  (table) => ({
    coupleStartsOnIdx: index('events_couple_id_starts_on_idx').on(table.coupleId, table.startsOn),
  }),
);

/** Aniversários e datas avulsas. Bodas e namoro não entram aqui (ADR 0003, 3.7). */
export const importantDates = pgTable(
  'important_dates',
  {
    ...coreColumns,
    coupleId: coupleColumn(),
    title: text('title').notNull(),
    occursOn: date('occurs_on', { mode: 'string' }).notNull(),
    repeatsYearly: boolean('repeats_yearly').notNull(),
  },
  (table) => ({
    coupleIdx: index('important_dates_couple_id_idx').on(table.coupleId),
  }),
);

export type AgendaEventRow = typeof agendaEvents.$inferSelect;
export type NewAgendaEventRow = typeof agendaEvents.$inferInsert;
export type ImportantDateRow = typeof importantDates.$inferSelect;
export type NewImportantDateRow = typeof importantDates.$inferInsert;
