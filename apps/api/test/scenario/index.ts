import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MemoryTransport } from '../../src/modules/mail/transports/memory.transport';
import request from 'supertest';
import { getTestPool } from '../integration-setup';

type UserRole = 'user' | 'admin';

type CreateUserOpts = {
  email: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
};

type UserCredentials = {
  email: string;
  password: string;
};

type SentEmail = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type AuthAgent = Pick<request.SuperAgentTest, 'get' | 'post' | 'patch' | 'delete' | 'put'>;

type CreateCoupleOpts = {
  datingStartedOn?: string | null;
  marriedOn?: string | null;
  blueDisplayName?: string;
  purpleDisplayName?: string;
};

export type CoupleLogin = {
  user: UserCredentials;
  agent: AuthAgent;
  memberId: string;
};

export type CoupleScenario = {
  coupleId: string;
  blue: CoupleLogin;
  purple: CoupleLogin;
};

export function makeScenario(app: INestApplication, transport?: MemoryTransport) {
  async function createUser(opts: CreateUserOpts): Promise<UserCredentials> {
    const password = opts.password ?? 'SenhaForte123';
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: opts.email, password, fullName: 'Usuário Teste' })
      .expect(201);

    const pool = getTestPool();

    if (opts.role === 'admin') {
      await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [opts.email]);
    }

    if (opts.isActive === false) {
      await pool.query(`UPDATE users SET is_active = false WHERE email = $1`, [opts.email]);
    }

    return { email: opts.email, password };
  }

  async function loginAs(user: UserCredentials): Promise<AuthAgent> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    const setCookieHeader = (loginRes.headers['set-cookie'] ?? []) as string[];
    const cookieStr = setCookieHeader.map((cookie: string) => cookie.split(';')[0]).join('; ');

    const server = app.getHttpServer();
    return {
      get: (url: string) => request(server).get(url).set('Cookie', cookieStr),
      post: (url: string) => request(server).post(url).set('Cookie', cookieStr),
      patch: (url: string) => request(server).patch(url).set('Cookie', cookieStr),
      delete: (url: string) => request(server).delete(url).set('Cookie', cookieStr),
      put: (url: string) => request(server).put(url).set('Cookie', cookieStr),
    };
  }

  async function lastEmailTo(email: string, maxWaitMs = 3000): Promise<SentEmail | undefined> {
    if (!transport) throw new Error('transport not provided to makeScenario');
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const found = transport.sent.filter((msg) => msg.to === email).at(-1);
      if (found) return found as SentEmail;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return undefined;
  }

  function extractLinkToken(email: SentEmail, param = 'token'): string {
    const text = email.text ?? email.html ?? '';
    const match = new RegExp(`[?&]${param}=([^&\\s"'<]+)`).exec(text);
    if (!match) throw new Error(`param '${param}' not found in email`);
    return match[1];
  }

  function cookieFrom(headers: Record<string, string | string[]>, name: string): string {
    const setCookie = (headers['set-cookie'] ?? []) as string[];
    const entry = setCookie.find((cookie) => cookie.startsWith(name + '='));
    if (!entry) throw new Error(`cookie '${name}' not found in response`);
    return entry.split(';')[0];
  }

  async function createCouple(opts: CreateCoupleOpts = {}): Promise<CoupleScenario> {
    const suffix = randomUUID();
    const blueUser = await createUser({
      email: `azul-${suffix}@teste.com`,
      role: 'admin',
    });
    const purpleUser = await createUser({ email: `roxo-${suffix}@teste.com` });

    const pool = getTestPool();
    const coupleResult = await pool.query<{ id: string }>(
      `INSERT INTO couples (dating_started_on, married_on) VALUES ($1, $2) RETURNING id`,
      [opts.datingStartedOn ?? null, opts.marriedOn ?? null],
    );
    const coupleId = coupleResult.rows[0]?.id;
    if (!coupleId) throw new Error('Falha ao criar casal no cenário');

    const blueMember = await insertMember(
      coupleId,
      blueUser.email,
      opts.blueDisplayName ?? 'Bruno',
      'blue',
    );
    const purpleMember = await insertMember(
      coupleId,
      purpleUser.email,
      opts.purpleDisplayName ?? 'Ela',
      'purple',
    );

    return {
      coupleId,
      blue: { user: blueUser, agent: await loginAs(blueUser), memberId: blueMember },
      purple: { user: purpleUser, agent: await loginAs(purpleUser), memberId: purpleMember },
    };
  }

  async function insertMember(
    coupleId: string,
    email: string,
    displayName: string,
    color: 'blue' | 'purple',
  ): Promise<string> {
    const result = await getTestPool().query<{ id: string }>(
      `INSERT INTO couple_members (couple_id, user_id, display_name, color)
       SELECT $1, id, $2, $3::member_color FROM users WHERE email = $4
       RETURNING id`,
      [coupleId, displayName, color, email],
    );
    const memberId = result.rows[0]?.id;
    if (!memberId) throw new Error(`Falha ao criar membro ${color} no cenário`);
    return memberId;
  }

  return { createUser, createCouple, loginAs, lastEmailTo, extractLinkToken, cookieFrom };
}
