import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from './core-columns';
import { coupleMembers, couples } from './couple-schema';

export const giftCategoryEnum = pgEnum('gift_category', [
  'clothing',
  'accessory',
  'electronics',
  'gym',
  'setup',
  'romantic',
  'home',
  'beauty',
  'experience',
  'other',
]);

/**
 * Lista individual de presentes. A reserva é segredo do dono: a resposta ao dono
 * nunca contém `reserved_*`.
 */
export const gifts = pgTable(
  'gifts',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    ownerMemberId: uuid('owner_member_id')
      .notNull()
      .references(() => coupleMembers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: giftCategoryEnum('category').notNull(),
    url: text('url'),
    imageUrl: text('image_url'),
    priceCents: integer('price_cents'),
    notes: text('notes'),
    reservedByMemberId: uuid('reserved_by_member_id').references(() => coupleMembers.id, {
      onDelete: 'set null',
    }),
    reservedAt: timestamp('reserved_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
  },
  (table) => [index('gifts_couple_id_owner_member_id_idx').on(table.coupleId, table.ownerMemberId)],
);

export type GiftRow = typeof gifts.$inferSelect;
export type NewGiftRow = typeof gifts.$inferInsert;
