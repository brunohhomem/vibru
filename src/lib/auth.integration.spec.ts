import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { getDatabase } from '@/db/client';
import { account, rateLimit, user } from '@/db/auth-schema';
import { auth } from './auth';
import { buildSignInRequest } from './sign-in-request.test-helper';

const knownPassword = 'senha-correta-123';
const knownEmail = `login-${randomUUID()}@example.com`;

async function insertKnownUser(): Promise<void> {
  const context = await auth.$context;
  const userId = randomUUID();
  const passwordHash = await context.password.hash(knownPassword);
  const database = getDatabase();
  await database.insert(user).values({ id: userId, name: 'Teste', email: knownEmail });
  await database.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
  });
}

describe('auth (Better Auth com e-mail e senha)', () => {
  beforeAll(insertKnownUser);

  it('entra com a senha correta e devolve o cookie de sessão', async () => {
    const response = await auth.handler(buildSignInRequest(knownEmail, knownPassword, '10.0.0.1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('session_token');
  });

  it('devolve o mesmo erro para senha errada e para e-mail inexistente', async () => {
    const wrongPassword = await auth.handler(buildSignInRequest(knownEmail, 'errada', '10.0.0.2'));
    const unknownEmail = await auth.handler(
      buildSignInRequest(`ninguem-${randomUUID()}@example.com`, 'qualquer', '10.0.0.3'),
    );
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it('recusa cadastro de e-mail novo (signUp desabilitado)', async () => {
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    headers.set('x-forwarded-for', '10.0.0.4');
    const response = await auth.handler(
      new Request('http://localhost:3100/api/auth/sign-up/email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: `novo-${randomUUID()}@example.com`,
          password: 'x'.repeat(12),
          name: 'Novo',
        }),
      }),
    );
    expect(response.ok).toBe(false);
  });

  it('bloqueia depois de 5 tentativas erradas e grava o contador no banco', async () => {
    const clientIp = `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await auth.handler(buildSignInRequest(knownEmail, 'errada', clientIp));
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);

    const storedRows = await getDatabase().select().from(rateLimit).where(eq(rateLimit.count, 5));
    expect(storedRows.length).toBeGreaterThan(0);
  });

  it('não aceita duas linhas de rate limit com a mesma chave (race de primeira requisição)', async () => {
    const key = `unique-key-${randomUUID()}`;
    const database = getDatabase();
    await database.insert(rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: 1 });

    await expect(
      database.insert(rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: 1 }),
    ).rejects.toThrow();
  });
});
