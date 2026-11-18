import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { coupleMembers } from '../couple/couple-member.entity';
import { couples } from '../couple/couple.entity';

/**
 * Remédio de um membro. Cada horário gera uma tarefa diária (ADR 0004, regra
 * 4.1); `stock_units` nulo significa que o estoque não é controlado.
 * `low_stock_prompted_at` garante que a pergunta da Farmácia aparece uma vez
 * por reposição.
 */
export const medications = pgTable(
  'medications',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => coupleMembers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    dosage: text('dosage').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    times: text('times')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isContinuous: boolean('is_continuous').notNull().default(true),
    stockUnits: integer('stock_units'),
    unitsPerDose: integer('units_per_dose').notNull().default(1),
    lowStockDays: integer('low_stock_days').notNull().default(7),
    lowStockPromptedAt: timestamp('low_stock_prompted_at', { withTimezone: true }),
  },
  (table) => ({
    coupleIdx: index('medications_couple_id_idx').on(table.coupleId),
    memberIdx: index('medications_member_id_idx').on(table.memberId),
    stockCheck: check(
      'medications_stock_units_check',
      sql`${table.stockUnits} IS NULL OR ${table.stockUnits} >= 0`,
    ),
    unitsPerDoseCheck: check('medications_units_per_dose_check', sql`${table.unitsPerDose} >= 1`),
  }),
);

export type MedicationRow = typeof medications.$inferSelect;
export type NewMedicationRow = typeof medications.$inferInsert;
