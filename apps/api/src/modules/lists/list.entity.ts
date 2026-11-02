import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { couples } from '../couple/couple.entity';

/** Lista do casal. A exclusão é lógica (`is_active = false`). */
export const lists = pgTable(
  'lists',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
  },
  (table) => ({
    coupleUpdatedIdx: index('lists_couple_id_updated_at_idx').on(table.coupleId, table.updatedAt),
  }),
);

export type ListRow = typeof lists.$inferSelect;
export type NewListRow = typeof lists.$inferInsert;
