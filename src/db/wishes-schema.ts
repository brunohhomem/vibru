import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from './core-columns';
import { couples } from './couple-schema';

export const wishCategoryEnum = pgEnum('wish_category', [
  'movie',
  'music',
  'travel',
  'together',
  'date_idea',
  'other',
]);

/** Desejos do casal; ideia de rolê é uma categoria, não um módulo. */
export const wishes = pgTable(
  'wishes',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: wishCategoryEnum('category').notNull(),
    url: text('url'),
    imageUrl: text('image_url'),
    priceCents: integer('price_cents'),
    notes: text('notes'),
    doneAt: timestamp('done_at', { withTimezone: true }),
  },
  (table) => [index('wishes_couple_id_idx').on(table.coupleId)],
);

export type WishRow = typeof wishes.$inferSelect;
export type NewWishRow = typeof wishes.$inferInsert;
