import { date, pgTable } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';

/**
 * Casal. As datas são de calendário (`YYYY-MM-DD`), nunca `Date`: o dia civil
 * não pode depender do fuso do processo (ADR 0003, seção 3).
 */
export const couples = pgTable('couples', {
  ...coreColumns,
  datingStartedOn: date('dating_started_on', { mode: 'string' }),
  marriedOn: date('married_on', { mode: 'string' }),
});

export type Couple = typeof couples.$inferSelect;
export type NewCouple = typeof couples.$inferInsert;
