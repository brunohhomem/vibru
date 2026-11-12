import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type {
  AgendaEvent,
  AgendaResponse,
  ErrorResponse,
  Wish,
  WishesResponse,
} from '@vibru/shared';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Desejos', () => {
  let app: INestApplication;
  let internalServer: Server;
  let internalUrl: string;
  let internalRequests = 0;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
    internalServer = createServer((_req, res) => {
      internalRequests += 1;
      res.end('<head><meta property="og:image" content="/segredo.jpg"></head>');
    });
    await new Promise<void>((resolve) => internalServer.listen(0, '127.0.0.1', resolve));
    internalUrl = `http://127.0.0.1:${(internalServer.address() as AddressInfo).port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => internalServer.close(() => resolve()));
    await closeTestApp(app);
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    await resetThrottle();
    internalRequests = 0;
  });

  async function createWish(couple: CoupleScenario, data: Record<string, unknown>): Promise<Wish> {
    const res = await couple.blue.agent
      .post('/api/wishes')
      .send({ title: 'Cinema', category: 'movie', ...data })
      .expect(201);
    return res.body as Wish;
  }

  async function listWishes(couple: CoupleScenario, status = 'open'): Promise<Wish[]> {
    const res = await couple.purple.agent.get(`/api/wishes?status=${status}`).expect(200);
    return (res.body as WishesResponse).wishes;
  }

  it('Membro cria, edita e remove desejo; a parceira vê', async () => {
    const couple = await makeScenario(app).createCouple({});
    const wish = await createWish(couple, {
      title: 'Viagem para a serra',
      category: 'travel',
      priceCents: 150000,
      notes: 'Em julho',
    });

    expect(await listWishes(couple)).toEqual([
      expect.objectContaining({
        title: 'Viagem para a serra',
        category: 'travel',
        url: null,
        imageUrl: null,
        priceCents: 150000,
        notes: 'Em julho',
        doneAt: null,
        plannedOn: null,
      }),
    ]);

    await couple.purple.agent
      .patch(`/api/wishes/${wish.id}`)
      .send({ priceCents: null, category: 'together' })
      .expect(200);
    expect((await listWishes(couple))[0]).toMatchObject({ priceCents: null, category: 'together' });

    await couple.blue.agent.delete(`/api/wishes/${wish.id}`).expect(204);
    expect(await listWishes(couple)).toHaveLength(0);
  });

  it('Membro salva um desejo com URL que aponta para IP interno', async () => {
    const couple = await makeScenario(app).createCouple({});

    const wish = await createWish(couple, { url: internalUrl });

    expect(wish).toMatchObject({ url: internalUrl, imageUrl: null });
    expect(internalRequests).toBe(0);
  });

  it('Membro informa a imagem manualmente quando a busca falha', async () => {
    const couple = await makeScenario(app).createCouple({});
    const wish = await createWish(couple, { url: internalUrl });

    const updated = await couple.purple.agent
      .patch(`/api/wishes/${wish.id}`)
      .send({ imageUrl: 'https://img.exemplo.com/a.jpg' })
      .expect(200);

    expect((updated.body as Wish).imageUrl).toBe('https://img.exemplo.com/a.jpg');
    expect(internalRequests).toBe(0);

    await couple.purple.agent
      .patch(`/api/wishes/${wish.id}`)
      .send({ imageUrl: 'javascript:alert(1)' })
      .expect(400);
  });

  it('Membro marca desejo como feito', async () => {
    const couple = await makeScenario(app).createCouple({});
    const wish = await createWish(couple, {});

    await couple.blue.agent.post(`/api/wishes/${wish.id}/done`).expect(200);
    expect(await listWishes(couple, 'open')).toHaveLength(0);
    const done = await listWishes(couple, 'done');
    expect(done).toHaveLength(1);
    expect(done[0]?.doneAt).not.toBeNull();

    await couple.blue.agent.delete(`/api/wishes/${wish.id}/done`).expect(200);
    expect(await listWishes(couple, 'open')).toHaveLength(1);
  });

  it('Membro planeja um desejo', async () => {
    const couple = await makeScenario(app).createCouple({});
    const wish = await createWish(couple, { title: 'Piquenique', category: 'date_idea' });

    const planned = await couple.blue.agent
      .post(`/api/wishes/${wish.id}/plan`)
      .send({ startsOn: '2099-12-20', startTime: '19:00' })
      .expect(201);

    expect(planned.body as AgendaEvent).toMatchObject({
      title: 'Piquenique',
      startsOn: '2099-12-20',
      startTime: '19:00',
      wishId: wish.id,
    });

    const agenda = await couple.purple.agent.get('/api/agenda?month=2099-12').expect(200);
    expect((agenda.body as AgendaResponse).events[0]).toMatchObject({ wishId: wish.id });
    expect((await listWishes(couple))[0]?.plannedOn).toBe('2099-12-20');
  });

  it('Desejo planejado é removido', async () => {
    const couple = await makeScenario(app).createCouple({});
    const wish = await createWish(couple, { title: 'Piquenique', category: 'date_idea' });
    await couple.blue.agent
      .post(`/api/wishes/${wish.id}/plan`)
      .send({ startsOn: '2099-12-20' })
      .expect(201);

    await couple.blue.agent.delete(`/api/wishes/${wish.id}`).expect(204);

    const agenda = await couple.purple.agent.get('/api/agenda?month=2099-12').expect(200);
    expect((agenda.body as AgendaResponse).events[0]).toMatchObject({
      title: 'Piquenique',
      wishId: null,
    });
  });

  it('Membro salva preço negativo, categoria inválida ou URL sem http', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = { title: 'Cinema', category: 'movie' };

    await couple.blue.agent
      .post('/api/wishes')
      .send({ ...base, priceCents: -1 })
      .expect(400);
    await couple.blue.agent
      .post('/api/wishes')
      .send({ ...base, category: 'festa' })
      .expect(400);
    await couple.blue.agent
      .post('/api/wishes')
      .send({ ...base, url: 'ftp://x.com' })
      .expect(400);
    await couple.blue.agent
      .post('/api/wishes')
      .send({ ...base, title: '  ' })
      .expect(400);
  });

  it('Membro de outro casal vê, edita, conclui, planeja ou exclui desejo deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const wish = await createWish(couple, {});
    const intruder = otherCouple.blue.agent;
    const path = `/api/wishes/${wish.id}`;

    const seen = await intruder.get('/api/wishes').expect(200);
    expect((seen.body as WishesResponse).wishes).toHaveLength(0);

    const attempts = [
      await intruder.patch(path).send({ title: 'Invadido' }),
      await intruder.post(`${path}/done`),
      await intruder.post(`${path}/plan`).send({ startsOn: '2099-12-20' }),
      await intruder.delete(path),
      await intruder.delete('/api/wishes/nao-e-uuid'),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('WISH_NOT_FOUND');
    }

    expect((await listWishes(couple))[0]?.title).toBe('Cinema');
  });
});
