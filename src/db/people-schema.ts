import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { coreColumns } from './core-columns';

/**
 * Dados pessoais de cada usuário. A linha nasce na primeira gravação do perfil
 * (o seed não a cria). CPF só em dígitos e único entre os usuários.
 */
export const people = pgTable(
  'people',
  {
    ...coreColumns,
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    cpf: text('cpf'),
    phone: text('phone'),
  },
  (table) => [
    uniqueIndex('people_user_id_idx').on(table.userId),
    uniqueIndex('people_cpf_idx').on(table.cpf),
  ],
);
