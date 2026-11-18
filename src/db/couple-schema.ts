import { date, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { coreColumns } from './core-columns';

/**
 * Casal. As datas são de calendário (`YYYY-MM-DD`), nunca `Date`: o dia civil
 * não pode depender do fuso do processo.
 */
export const couples = pgTable('couples', {
  ...coreColumns,
  datingStartedOn: date('dating_started_on', { mode: 'string' }),
  marriedOn: date('married_on', { mode: 'string' }),
});

export const memberColorEnum = pgEnum('member_color', ['blue', 'purple']);

/**
 * Vínculo entre usuário e casal. A cor identifica a pessoa na interface e é
 * única dentro do casal; `user_id` é único para um usuário pertencer a um
 * único casal.
 */
export const coupleMembers = pgTable(
  'couple_members',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    color: memberColorEnum('color').notNull(),
    // Só o SHA-256: a URL do feed é a credencial. Nulo = feed desligado.
    icsTokenHash: text('ics_token_hash'),
  },
  (table) => [
    index('couple_members_couple_id_idx').on(table.coupleId),
    uniqueIndex('couple_members_user_id_idx').on(table.userId),
    uniqueIndex('couple_members_couple_id_color_idx').on(table.coupleId, table.color),
    uniqueIndex('couple_members_ics_token_hash_idx').on(table.icsTokenHash),
  ],
);

export type CoupleRow = typeof couples.$inferSelect;
export type CoupleMemberRow = typeof coupleMembers.$inferSelect;
