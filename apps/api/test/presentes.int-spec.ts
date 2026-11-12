import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ErrorResponse, GiftForPartner, GiftsResponse, IcsFeedCreated } from '@vibru/shared';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Presentes', () => {
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

  /** Bruno é o azul (dono da lista); ela é a roxa. */
  function brunoGifts(couple: CoupleScenario): string {
    return `/api/members/${couple.blue.memberId}/gifts`;
  }

  async function createBrunoGift(
    couple: CoupleScenario,
    data: Record<string, unknown> = {},
  ): Promise<{ id: string }> {
    const res = await couple.blue.agent
      .post(brunoGifts(couple))
      .send({ title: 'Tênis', category: 'clothing', ...data })
      .expect(201);
    return res.body as { id: string };
  }

  async function list(couple: CoupleScenario, as: 'blue' | 'purple', status = 'wanted') {
    const res = await couple[as].agent.get(`${brunoGifts(couple)}?status=${status}`).expect(200);
    return (res.body as GiftsResponse).gifts;
  }

  it('Ela reserva um presente do Bruno; Bruno lista os presentes dele', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple, { priceCents: 39990 });

    await couple.purple.agent.post(`${brunoGifts(couple)}/${gift.id}/reservation`).expect(201);

    const ownerView = await list(couple, 'blue');
    expect(ownerView[0]).toMatchObject({ title: 'Tênis', priceCents: 39990 });
    expect(ownerView[0]).not.toHaveProperty('reservedByMemberId');
    expect(ownerView[0]).not.toHaveProperty('reservedAt');

    const patched = await couple.blue.agent
      .patch(`${brunoGifts(couple)}/${gift.id}`)
      .send({ notes: 'Número 42' })
      .expect(200);
    expect(patched.body).not.toHaveProperty('reservedByMemberId');

    const received = await couple.blue.agent
      .post(`${brunoGifts(couple)}/${gift.id}/received`)
      .expect(200);
    expect(received.body).not.toHaveProperty('reservedByMemberId');
    expect(received.body).not.toHaveProperty('reservedAt');
  });

  it('Ela lista os presentes do Bruno', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple);
    await couple.purple.agent.post(`${brunoGifts(couple)}/${gift.id}/reservation`).expect(201);

    const partnerView = (await list(couple, 'purple')) as GiftForPartner[];

    expect(partnerView[0]?.reservedByMemberId).toBe(couple.purple.memberId);
    expect(partnerView[0]?.reservedAt).not.toBeNull();

    await couple.purple.agent.delete(`${brunoGifts(couple)}/${gift.id}/reservation`).expect(200);
    const released = (await list(couple, 'purple')) as GiftForPartner[];
    expect(released[0]?.reservedByMemberId).toBeNull();
  });

  it('Bruno tenta reservar um presente da própria lista', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple);

    const res = await couple.blue.agent
      .post(`${brunoGifts(couple)}/${gift.id}/reservation`)
      .expect(422);

    expect((res.body as ErrorResponse).code).toBe('GIFT_SELF_RESERVATION');
  });

  it('Ela tenta reservar um presente já reservado', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple);
    await couple.purple.agent.post(`${brunoGifts(couple)}/${gift.id}/reservation`).expect(201);

    const res = await couple.purple.agent
      .post(`${brunoGifts(couple)}/${gift.id}/reservation`)
      .expect(409);

    expect((res.body as ErrorResponse).code).toBe('GIFT_ALREADY_RESERVED');
  });

  it('Ela tenta criar, editar ou apagar um presente do Bruno', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple);
    const path = `${brunoGifts(couple)}/${gift.id}`;

    const attempts = [
      await couple.purple.agent
        .post(brunoGifts(couple))
        .send({ title: 'Relógio', category: 'accessory' }),
      await couple.purple.agent.patch(path).send({ title: 'Outro' }),
      await couple.purple.agent.delete(path),
      await couple.purple.agent.post(`${path}/received`),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(403);
      expect((res.body as ErrorResponse).code).toBe('GIFT_NOT_OWNER');
    }
  });

  it('Bruno marca como recebido', async () => {
    const couple = await makeScenario(app).createCouple({});
    const gift = await createBrunoGift(couple);

    await couple.blue.agent.post(`${brunoGifts(couple)}/${gift.id}/received`).expect(200);

    expect(await list(couple, 'purple', 'wanted')).toHaveLength(0);
    const received = await list(couple, 'purple', 'received');
    expect(received[0]?.receivedAt).not.toBeNull();
  });

  it('Presente com URL de IP interno', async () => {
    const couple = await makeScenario(app).createCouple({});
    const created = await couple.blue.agent
      .post(brunoGifts(couple))
      .send({ title: 'Tênis', category: 'clothing', url: internalUrl })
      .expect(201);

    expect(created.body).toMatchObject({ url: internalUrl, imageUrl: null });
    expect(internalRequests).toBe(0);

    const manual = await couple.blue.agent
      .patch(`${brunoGifts(couple)}/${(created.body as { id: string }).id}`)
      .send({ imageUrl: 'https://img.exemplo.com/tenis.jpg' })
      .expect(200);
    expect(manual.body).toMatchObject({ imageUrl: 'https://img.exemplo.com/tenis.jpg' });
  });

  it('Membro de outro casal lista, reserva ou edita presente deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const gift = await createBrunoGift(couple);
    const intruder = otherCouple.purple.agent;
    const path = `${brunoGifts(couple)}/${gift.id}`;

    const attempts = [
      await intruder.get(brunoGifts(couple)),
      await intruder.post(`${path}/reservation`),
      await intruder.patch(path).send({ title: 'Invadido' }),
      await otherCouple.blue.agent.post(
        `/api/members/${otherCouple.blue.memberId}/gifts/${gift.id}/reservation`,
      ),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('GIFT_NOT_FOUND');
    }
  });

  it('Feed ICS não inclui presentes', async () => {
    const couple = await makeScenario(app).createCouple({});
    await createBrunoGift(couple, { title: 'Presente surpresa' });
    const feed = await couple.blue.agent.post('/api/agenda/ics').expect(201);

    const res = await request(app.getHttpServer())
      .get((feed.body as IcsFeedCreated).feedPath)
      .expect(200);

    expect(res.text).not.toContain('Presente surpresa');
  });
});
