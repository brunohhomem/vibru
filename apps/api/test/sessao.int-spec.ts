import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { setupTestDatabase, teardownTestDatabase, getTestPool } from './integration-setup';
import { makeScenario } from './scenario';

describe('Sessão', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    await resetThrottle();
  });

  it('Cookie de acesso vive o prazo do refresh para a navegação não cair no login', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'navegacao@teste.com' });

    const maxAgeOf = (headers: Record<string, unknown>, name: string): string | undefined => {
      const cookies = headers['set-cookie'] as string[];
      const cookie = cookies.find((value) => value.startsWith(`${name}=`));
      return /Max-Age=(\d+)/.exec(cookie ?? '')?.[1];
    };

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    expect(maxAgeOf(loginRes.headers, 'refresh_token')).toBeDefined();
    expect(maxAgeOf(loginRes.headers, 'access_token')).toBe(
      maxAgeOf(loginRes.headers, 'refresh_token'),
    );

    const refreshCookie = scenario.cookieFrom(
      loginRes.headers as Record<string, string | string[]>,
      'refresh_token',
    );
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(maxAgeOf(refreshRes.headers, 'access_token')).toBe(
      maxAgeOf(refreshRes.headers, 'refresh_token'),
    );
  });

  it('Anônimo acessa rota protegida', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    expect(res.body.code).toBe('AUTH_UNAUTHORIZED');
  });

  it('Refresh antigo é reutilizado depois da rotação', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'refresh@teste.com' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    const originalRefreshCookie = scenario.cookieFrom(
      loginRes.headers as Record<string, string | string[]>,
      'refresh_token',
    );

    const firstRefresh = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [originalRefreshCookie])
      .expect(200);

    const firstNewRefresh = scenario.cookieFrom(
      firstRefresh.headers as Record<string, string | string[]>,
      'refresh_token',
    );

    const secondRefresh = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [firstNewRefresh])
      .expect(200);

    const secondCookies = secondRefresh.headers['set-cookie'] as string[];

    await new Promise((resolve) => setTimeout(resolve, 11000));

    const reuseRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [originalRefreshCookie])
      .expect(401);

    expect(reuseRes.body.code).toBe('AUTH_REFRESH_REUSED');

    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', secondCookies).expect(401);
  }, 20000);

  it('Usuário faz logout e tenta renovar a sessão', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'logout@teste.com' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    const accessCookie = scenario.cookieFrom(
      loginRes.headers as Record<string, string | string[]>,
      'access_token',
    );
    const refreshCookie = scenario.cookieFrom(
      loginRes.headers as Record<string, string | string[]>,
      'refresh_token',
    );

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', [accessCookie, refreshCookie])
      .expect(204);

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie])
      .expect(401);

    expect(res.body.code).toBe('AUTH_REFRESH_INVALID');
  });

  it('Admin desativa um usuário logado', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'desativar@teste.com' });
    const agent = await scenario.loginAs(user);

    await agent.get('/api/auth/me').expect(200);

    const pool = getTestPool();
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      user.email,
    ]);
    const userId = rows[0].id;
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [userId]);
    await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1', [userId]);

    await agent.get('/api/auth/me').expect(401);
  });
});
