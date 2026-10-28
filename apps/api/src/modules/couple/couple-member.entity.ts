import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { users } from '../auth/user.entity';
import { couples } from './couple.entity';

export const memberColorEnum = pgEnum('member_color', ['blue', 'purple']);

/**
 * Vínculo entre usuário e casal. A cor identifica a pessoa na interface e é
 * única dentro do casal; `user_id` é único para um usuário pertencer a um
 * único casal (ADR 0003, seção 3).
 */
export const coupleMembers = pgTable(
  'couple_members',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    color: memberColorEnum('color').notNull(),
  },
  (table) => ({
    coupleIdIdx: index('couple_members_couple_id_idx').on(table.coupleId),
    userIdIdx: uniqueIndex('couple_members_user_id_idx').on(table.userId),
    coupleColorIdx: uniqueIndex('couple_members_couple_id_color_idx').on(
      table.coupleId,
      table.color,
    ),
  }),
);

export type CoupleMemberRow = typeof coupleMembers.$inferSelect;
export type NewCoupleMember = typeof coupleMembers.$inferInsert;
