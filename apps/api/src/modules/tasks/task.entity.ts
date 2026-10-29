import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { coupleMembers } from '../couple/couple-member.entity';
import { couples } from '../couple/couple.entity';

export const taskRecurrenceEnum = pgEnum('task_recurrence', [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

/**
 * Tarefa de um casal. `assignee_member_id` nulo significa "nós".
 * Recorrência é ancorada no primeiro prazo: as ocorrências são
 * `recurrence_anchor_on + k × intervalo` (ADR 0003, seção 3).
 */
export const tasks = pgTable(
  'tasks',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    notes: text('notes'),
    assigneeMemberId: uuid('assignee_member_id').references(() => coupleMembers.id, {
      onDelete: 'set null',
    }),
    dueOn: date('due_on', { mode: 'string' }),
    recurrenceKind: taskRecurrenceEnum('recurrence_kind').notNull().default('none'),
    recurrenceInterval: integer('recurrence_interval').notNull().default(1),
    recurrenceAnchorOn: date('recurrence_anchor_on', { mode: 'string' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedByMemberId: uuid('completed_by_member_id').references(() => coupleMembers.id, {
      onDelete: 'set null',
    }),
    generatedFromTaskId: uuid('generated_from_task_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    coupleCompletedIdx: index('tasks_couple_id_completed_at_idx').on(
      table.coupleId,
      table.completedAt,
    ),
    coupleDueIdx: index('tasks_couple_id_due_on_idx').on(table.coupleId, table.dueOn),
    generatedFromIdx: index('tasks_generated_from_task_id_idx').on(table.generatedFromTaskId),
    recurrenceCheck: check(
      'tasks_recurrence_check',
      sql`${table.recurrenceKind} = 'none' OR (${table.dueOn} IS NOT NULL AND ${table.recurrenceAnchorOn} IS NOT NULL)`,
    ),
  }),
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
