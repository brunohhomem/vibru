import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDatabase } from './client';

describe('database client', () => {
  it('executa uma consulta no Postgres', async () => {
    const result = await getDatabase().execute<{ ok: number }>(sql`select 1 as ok`);
    expect(result.rows[0]?.ok).toBe(1);
  });

  it('devolve a mesma instância ao reimportar o módulo (singleton)', async () => {
    const reimported = await import('./client?again');
    expect(reimported.getDatabase()).toBe(getDatabase());
  });

  it('lê a tabela system_settings criada pela migration inicial', async () => {
    const result = await getDatabase().execute<{ total: number }>(
      sql`select count(*)::int as total from system_settings`,
    );
    expect(result.rows[0]?.total).toBe(0);
  });
});
