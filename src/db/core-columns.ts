import { sql } from 'drizzle-orm';
import { boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Colunas comuns às tabelas de domínio:
 * - `id`: UUID v7 gerado pelo banco (ordenável por tempo);
 * - `isActive`: exclusão lógica sem coluna `deleted_at`;
 * - `updatedAt`: mantido pelo Drizzle via `$onUpdate`, não pelo banco.
 */
export const coreColumns = {
  id: uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
