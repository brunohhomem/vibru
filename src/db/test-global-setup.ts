import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Aplica as migrations na branch de teste do Neon antes da suíte. Usa a conexão direta.
export default async function applyMigrationsToTestBranch(): Promise<void> {
  const pooledUrl = process.env.TEST_DATABASE_URL;
  if (!pooledUrl) throw new Error('TEST_DATABASE_URL ausente.');

  const pool = new Pool({ connectionString: pooledUrl.replace('-pooler', ''), max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.resolve('src/db/migrations') });
  } finally {
    await pool.end();
  }
}
