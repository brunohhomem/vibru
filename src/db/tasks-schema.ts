import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { coreColumns } from './core-columns';
import { coupleMembers, couples } from './couple-schema';

export const taskRecurrenceEnum = pgEnum('task_recurrence', [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

export const taskCategoryEnum = pgEnum('task_category', [
  'home',
  'health',
  'shopping',
  'bills',
  'other',
]);

/**
 * Tarefa de um casal. `assignee_member_id` nulo significa "nós". Recorrência é
 * ancorada no primeiro prazo: as ocorrências são `recurrence_anchor_on + k × intervalo`.
 * `medication_id` ainda não tem FK: a tabela de remédios chega com o lote D.
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
    dueTime: time('due_time'),
    category: taskCategoryEnum('category').notNull().default('other'),
    medicationId: uuid('medication_id'),
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
  (table) => [
    index('tasks_couple_id_completed_at_idx').on(table.coupleId, table.completedAt),
    index('tasks_couple_id_due_on_idx').on(table.coupleId, table.dueOn),
    index('tasks_medication_id_idx').on(table.medicationId),
    index('tasks_generated_from_task_id_idx').on(table.generatedFromTaskId),
    check('tasks_due_time_check', sql`${table.dueTime} IS NULL OR ${table.dueOn} IS NOT NULL`),
    check(
      'tasks_recurrence_check',
      sql`${table.recurrenceKind} = 'none' OR (${table.dueOn} IS NOT NULL AND ${table.recurrenceAnchorOn} IS NOT NULL)`,
    ),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
