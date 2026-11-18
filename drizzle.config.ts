import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Migrations usam a conexão direta (sem -pooler): o PgBouncer em modo transação não serve para DDL.
const migrationUrl = process.env.DATABASE_URL_UNPOOLED;
if (!migrationUrl) {
  throw new Error('DATABASE_URL_UNPOOLED ausente: rode `neon env pull`.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: migrationUrl },
});
