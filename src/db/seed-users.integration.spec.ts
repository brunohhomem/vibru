import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { auth } from '@/lib/auth';
import { getDatabase } from './client';
import { account, user } from './auth-schema';
import { buildSignInRequest } from '@/lib/sign-in-request.test-helper';
import { seedUsers } from './seed-users';

function buildSeedInput() {
  const suffix = randomUUID();
  return [
    { email: `um-${suffix}@example.com`, password: 'senha-um-12345', name: 'Um' },
    { email: `dois-${suffix}@example.com`, password: 'senha-dois-12345', name: 'Dois' },
  ];
}

async function readPasswordHash(email: string): Promise<string | null | undefined> {
  const [row] = await getDatabase()
    .select({ password: account.password })
    .from(account)
    .innerJoin(user, eq(user.id, account.userId))
    .where(eq(user.email, email.toLowerCase()));
  return row?.password;
}

describe('seedUsers', () => {
  it('cria os 2 usuários e não duplica nem troca a senha ao rodar de novo', async () => {
    const input = buildSeedInput();
    const first = await seedUsers(input);
    const hashAfterFirstRun = await readPasswordHash(input[0]!.email);

    const second = await seedUsers(input);

    expect(first).toEqual({ created: 2, skipped: 0 });
    expect(second).toEqual({ created: 0, skipped: 2 });
    expect(await readPasswordHash(input[0]!.email)).toBe(hashAfterFirstRun);
  });

  it('trata e-mail em caixa diferente como o mesmo usuário', async () => {
    const [first] = buildSeedInput();
    await seedUsers([first!]);

    const result = await seedUsers([{ ...first!, email: first!.email.toUpperCase() }]);

    expect(result).toEqual({ created: 0, skipped: 1 });
  });

  it('permite o login do usuário semeado', async () => {
    const [first] = buildSeedInput();
    await seedUsers([first!]);

    const response = await auth.handler(
      buildSignInRequest(
        first!.email,
        first!.password,
        `10.2.${Math.floor(Math.random() * 250)}.1`,
      ),
    );

    expect(response.status).toBe(200);
  });
});
