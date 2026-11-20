import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
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

/**
 * Quais avisos a pessoa quer, valendo para todos os aparelhos dela. Sem linha, valem os
 * padrões das colunas. `low_stock` nasce desligado: fala de remédio e aparece na tela de
 * bloqueio, então a pessoa precisa escolher receber.
 */
export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  taskAssigned: boolean('task_assigned').notNull().default(true),
  taskCompleted: boolean('task_completed').notNull().default(true),
  dailySummary: boolean('daily_summary').notNull().default(true),
  tomorrowPreview: boolean('tomorrow_preview').notNull().default(true),
  lowStock: boolean('low_stock').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect;

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
