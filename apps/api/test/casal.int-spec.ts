import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { CoupleResponse, ErrorResponse } from '@vibru/shared';
import { seedAdmin } from '../src/database/seed/admin.seed';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import {
  getTestDb,
  getTestPool,
  setupTestDatabase,
  teardownTestDatabase,
} from './integration-setup';
import { makeScenario } from './scenario';

describe('Casal', () => {
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

  it('Usuário sem casal consulta o casal', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'sem-casal@teste.com' });
    const agent = await scenario.loginAs(user);

    const res = await agent.get('/api/couple').expect(403);

    expect(res.body.code).toBe('COUPLE_REQUIRED');
  });

  it('Membro consulta o casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({
      datingStartedOn: '2020-01-10',
      marriedOn: '2022-05-20',
    });

    const blueRes = await couple.blue.agent.get('/api/couple').expect(200);
    const body = blueRes.body as CoupleResponse;

    expect(body.members).toHaveLength(2);
    expect(new Set(body.members.map((member) => member.color))).toEqual(
      new Set(['blue', 'purple']),
    );
    expect(body.members.filter((member) => member.isMe)).toHaveLength(1);
    expect(body.members.find((member) => member.isMe)?.id).toBe(couple.blue.memberId);
    expect(body.married).not.toBeNull();
    expect(body.nextWeddingAnniversary?.date.endsWith('-05-20')).toBe(true);

    const purpleRes = await couple.purple.agent.get('/api/couple').expect(200);
    const purpleBody = purpleRes.body as CoupleResponse;
    expect(purpleBody.members.find((member) => member.isMe)?.id).toBe(couple.purple.memberId);
  });

  it('Membro muda a data do casamento', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({
      datingStartedOn: '2020-01-10',
      marriedOn: '2022-05-20',
    });

    const before = await couple.blue.agent.get('/api/couple').expect(200);
    const beforeBody = before.body as CoupleResponse;

    const res = await couple.blue.agent
      .patch('/api/couple')
      .send({ marriedOn: '2023-06-15' })
      .expect(200);
    const body = res.body as CoupleResponse;

    expect(body.marriedOn).toBe('2023-06-15');
    expect(body.married?.totalDays).toBeGreaterThan(0);
    expect(body.nextWeddingAnniversary?.date.endsWith('-06-15')).toBe(true);
    expect(body.nextWeddingAnniversary?.date).not.toBe(beforeBody.nextWeddingAnniversary?.date);
  });

  it('Membro informa casamento antes do início do namoro', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({ datingStartedOn: '2020-01-10' });

    const res = await couple.blue.agent
      .patch('/api/couple')
      .send({ marriedOn: '2019-01-01' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.code).toBe('COUPLE_DATES_INVALID');
    expect(body.details?.[0]?.path).toContain('marriedOn');
  });

  it('Membro informa data no futuro', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});

    const res = await couple.blue.agent
      .patch('/api/couple')
      .send({ marriedOn: '2999-01-01' })
      .expect(400);

    expect((res.body as ErrorResponse).code).toBe('COUPLE_DATES_INVALID');
  });

  it('Membro muda o próprio nome no casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});

    await couple.purple.agent
      .patch('/api/couple/members/me')
      .send({ displayName: 'Parceira' })
      .expect(200);

    const res = await couple.blue.agent.get('/api/couple').expect(200);
    const body = res.body as CoupleResponse;

    expect(body.members.find((member) => member.id === couple.purple.memberId)?.displayName).toBe(
      'Parceira',
    );
  });

  it('Visitante tenta se cadastrar depois do seed', async () => {
    const pool = getTestPool();
    await pool.query(`DELETE FROM system_settings WHERE key = 'registration_enabled'`);
    await seedAdmin(getTestDb());

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'visitante@teste.com', password: 'SenhaForte123', fullName: 'Visitante' })
      .expect(403);

    expect((res.body as ErrorResponse).code).toBe('AUTH_REGISTRATION_DISABLED');
  });

  it('Rodar o seed duas vezes resulta em 1 casal, 2 membros e nenhuma senha sobrescrita', async () => {
    const db = getTestDb();
    const pool = getTestPool();

    await seedAdmin(db);
    const firstPasswords = await pool.query<{ email: string; passwordHash: string }>(
      `SELECT email, password_hash AS "passwordHash" FROM users ORDER BY email`,
    );

    await seedAdmin(db);

    const counts = await pool.query<{ couples: number; members: number }>(
      `SELECT (SELECT count(*)::int FROM couples) AS couples,
              (SELECT count(*)::int FROM couple_members) AS members`,
    );
    const secondPasswords = await pool.query<{ email: string; passwordHash: string }>(
      `SELECT email, password_hash AS "passwordHash" FROM users ORDER BY email`,
    );

    expect(counts.rows[0]).toEqual({ couples: 1, members: 2 });
    expect(secondPasswords.rows).toEqual(firstPasswords.rows);
  });
});
