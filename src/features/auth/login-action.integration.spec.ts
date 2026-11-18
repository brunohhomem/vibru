import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestContext = vi.hoisted(() => ({
  clientIp: '10.9.0.1',
  cookieSet: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => {
    const forwarded = new Headers();
    forwarded.set('x-forwarded-for', requestContext.clientIp);
    return forwarded;
  },
  cookies: async () => ({ set: requestContext.cookieSet, get: () => undefined }),
}));

const { loginAction } = await import('./actions');
const { seedUsers } = await import('@/db/seed-users');

const knownPassword = 'senha-correta-123';
const knownEmail = `acao-${randomUUID()}@example.com`;

describe('loginAction (caminho real de login)', () => {
  beforeEach(async () => {
    requestContext.clientIp = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    requestContext.cookieSet.mockClear();
    await seedUsers([{ email: knownEmail, password: knownPassword, name: 'Acao' }]);
  });

  it('entra com a senha certa e grava o cookie de sessão', async () => {
    const result = await loginAction({ email: knownEmail, password: knownPassword });

    expect(result).toMatchObject({ ok: true });
    const cookieNames = requestContext.cookieSet.mock.calls.map((call) => String(call[0]));
    expect(cookieNames.some((name) => name.includes('session_token'))).toBe(true);
  });

  it('bloqueia a 6ª tentativa errada pelo próprio loginAction', async () => {
    const codes: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await loginAction({ email: knownEmail, password: 'errada' });
      codes.push(result.ok ? 'ok' : `${result.code}:${result.message}`);
    }

    expect(codes.slice(0, 5)).toEqual(Array(5).fill('unauthenticated:E-mail ou senha incorretos.'));
    expect(codes[5]).toMatch(/^failed:Muitas tentativas/);
  });
});
