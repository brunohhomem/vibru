import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { coreColumns } from './core-columns';

/**
 * Configurações de sistema chave-valor. Cada chave é única e o valor é JSONB
 * para suportar tipos estruturados.
 */
export const systemSettings = pgTable(
  'system_settings',
  {
    ...coreColumns,
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
  },
  (table) => [uniqueIndex('system_settings_key_idx').on(table.key)],
);

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
