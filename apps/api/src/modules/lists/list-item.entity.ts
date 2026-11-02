import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { coupleMembers } from '../couple/couple-member.entity';
import { couples } from '../couple/couple.entity';
import { lists } from './list.entity';

/**
 * Item de uma lista. `checked_at` nulo significa aberto; quem marcou fica em
 * `checked_by_member_id` e é limpo ao desmarcar.
 */
export const listItems = pgTable(
  'list_items',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
    checkedByMemberId: uuid('checked_by_member_id').references(() => coupleMembers.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    coupleIdx: index('list_items_couple_id_idx').on(table.coupleId),
    listCheckedIdx: index('list_items_list_id_checked_at_idx').on(table.listId, table.checkedAt),
  }),
);

export type ListItemRow = typeof listItems.$inferSelect;
export type NewListItemRow = typeof listItems.$inferInsert;
