import { attachDatabasePool } from '@vercel/functions';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;

export type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** O que as consultas aceitam: o próprio banco ou uma transação aberta. */
export type DatabaseExecutor = Database | DatabaseTransaction;

// globalThis sobrevive ao hot reload do dev e evita um pool novo a cada recarga.
const globalForDatabase = globalThis as typeof globalThis & { vibruDatabase?: Database };

function createDatabase(): Database {
  const { DATABASE_URL, DATABASE_POOL_MAX } = getEnv();
  const pool = new Pool({ connectionString: DATABASE_URL, max: DATABASE_POOL_MAX });
  // Na Vercel (Fluid compute) fecha as conexões ociosas antes da função ser suspensa.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

// Lazy: `next build` importa módulos sem ter DATABASE_URL.
export function getDatabase(): Database {
  globalForDatabase.vibruDatabase ??= createDatabase();
  return globalForDatabase.vibruDatabase;
}
