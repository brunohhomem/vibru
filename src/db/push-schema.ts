import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { coreColumns } from './core-columns';

/**
 * Inscrição de push de um aparelho. Uma pessoa pode ter vários (celular e
 * notebook). O `endpoint` identifica o aparelho no serviço de push do navegador
 * e é único: reinstalar o app no mesmo aparelho atualiza a linha em vez de duplicar.
 * `p256dh` e `auth` são as chaves públicas que cifram a mensagem para esse aparelho.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: coreColumns.id,
    createdAt: coreColumns.createdAt,
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('push_subscriptions_user_id_idx').on(table.userId)],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
