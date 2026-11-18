import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ErrorResponse, List, ListItem, ListsResponse } from '@vibru/shared';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Listas', () => {
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

  async function createList(couple: CoupleScenario, title = 'Mercado'): Promise<List> {
    const res = await couple.blue.agent.post('/api/lists').send({ title }).expect(201);
    return res.body as List;
  }

  async function addItem(couple: CoupleScenario, listId: string, title: string): Promise<ListItem> {
    const res = await couple.blue.agent
      .post(`/api/lists/${listId}/items`)
      .send({ title })
      .expect(201);
    return res.body as ListItem;
  }

  async function getList(couple: CoupleScenario, listId: string, as: 'blue' | 'purple' = 'purple') {
    const res = await couple[as].agent.get(`/api/lists/${listId}`).expect(200);
    return res.body as List;
  }

  async function getSummaries(couple: CoupleScenario): Promise<ListsResponse> {
    const res = await couple.purple.agent.get('/api/lists').expect(200);
    return res.body as ListsResponse;
  }

  it('Membro cria uma lista', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple, 'Mercado da semana');

    expect(list.items).toEqual([]);
    expect(list.updatedAt).toBe(list.createdAt);

    const seenByPartner = await getSummaries(couple);
    expect(seenByPartner.lists).toEqual([
      expect.objectContaining({ id: list.id, title: 'Mercado da semana', totalItems: 0 }),
    ]);
  });

  it('Membro cria lista sem nome', async () => {
    const couple = await makeScenario(app).createCouple({});
    const res = await couple.blue.agent.post('/api/lists').send({ title: '   ' }).expect(400);

    expect(JSON.stringify(res.body)).toContain('title');
  });

  it('Membro adiciona um item', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    const seenByPartner = await getList(couple, list.id);
    expect(seenByPartner.items.map((entry) => entry.id)).toEqual([item.id]);
  });

  it('Membro adiciona item sem nome', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const res = await couple.blue.agent
      .post(`/api/lists/${list.id}/items`)
      .send({ title: '' })
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('title');
  });

  it('Membro marca um item', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    const res = await couple.blue.agent
      .post(`/api/lists/${list.id}/items/${item.id}/check`)
      .expect(200);
    expect((res.body as ListItem).checkedByMemberId).toBe(couple.blue.memberId);

    const seenByPartner = await getList(couple, list.id);
    expect(seenByPartner.items[0]).toMatchObject({
      id: item.id,
      checkedByMemberId: couple.blue.memberId,
    });
    expect(seenByPartner.items[0]?.checkedAt).not.toBeNull();
  });

  it('Membro marca o mesmo item de novo', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    const first = await couple.blue.agent
      .post(`/api/lists/${list.id}/items/${item.id}/check`)
      .expect(200);
    const second = await couple.purple.agent
      .post(`/api/lists/${list.id}/items/${item.id}/check`)
      .expect(200);

    expect(second.body).toEqual(first.body);
    const summaries = await getSummaries(couple);
    expect(summaries.lists[0]?.checkedItems).toBe(1);
  });

  it('Membro desmarca um item', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');
    await couple.blue.agent.post(`/api/lists/${list.id}/items/${item.id}/check`).expect(200);

    const res = await couple.purple.agent
      .post(`/api/lists/${list.id}/items/${item.id}/uncheck`)
      .expect(200);
    expect(res.body).toMatchObject({ checkedAt: null, checkedByMemberId: null });

    const seenByBlue = await getList(couple, list.id, 'blue');
    expect(seenByBlue.items[0]).toMatchObject({ checkedAt: null, checkedByMemberId: null });
  });

  it('Membro desmarca um item já aberto', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    const res = await couple.blue.agent
      .post(`/api/lists/${list.id}/items/${item.id}/uncheck`)
      .expect(200);

    expect(res.body).toMatchObject({ id: item.id, checkedAt: null, checkedByMemberId: null });
  });

  it('Membro edita o título de um item', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Cafe');

    await couple.blue.agent
      .patch(`/api/lists/${list.id}/items/${item.id}`)
      .send({ title: 'Café torrado' })
      .expect(200);

    const seenByPartner = await getList(couple, list.id);
    expect(seenByPartner.items[0]?.title).toBe('Café torrado');
  });

  it('Membro exclui um item', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    await couple.blue.agent.delete(`/api/lists/${list.id}/items/${item.id}`).expect(204);

    expect((await getList(couple, list.id)).items).toEqual([]);
    expect((await getList(couple, list.id, 'blue')).items).toEqual([]);
  });

  it('Membro limpa os marcados', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const checked = await addItem(couple, list.id, 'Café');
    const open = await addItem(couple, list.id, 'Pão');
    await couple.blue.agent.post(`/api/lists/${list.id}/items/${checked.id}/check`).expect(200);

    await couple.blue.agent.delete(`/api/lists/${list.id}/items/checked`).expect(204);

    const after = await getList(couple, list.id);
    expect(after.items.map((entry) => entry.id)).toEqual([open.id]);
  });

  it('Membro renomeia a lista', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple, 'Mercado');

    await couple.blue.agent
      .patch(`/api/lists/${list.id}`)
      .send({ title: 'Feira de sábado' })
      .expect(200);

    expect((await getList(couple, list.id)).title).toBe('Feira de sábado');
  });

  it('Membro exclui a lista', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');

    await couple.blue.agent.delete(`/api/lists/${list.id}`).expect(204);

    expect((await getSummaries(couple)).lists).toEqual([]);
    await couple.purple.agent.get(`/api/lists/${list.id}`).expect(404);
    const itemRes = await couple.purple.agent
      .post(`/api/lists/${list.id}/items/${item.id}/check`)
      .expect(404);
    expect((itemRes.body as ErrorResponse).code).toBe('LIST_NOT_FOUND');
  });

  it('A lista com atividade mais recente aparece primeiro', async () => {
    const couple = await makeScenario(app).createCouple({});
    const older = await createList(couple, 'Antiga');
    const newer = await createList(couple, 'Nova');

    expect((await getSummaries(couple)).lists.map((entry) => entry.id)).toEqual([
      newer.id,
      older.id,
    ]);

    const item = await addItem(couple, older.id, 'Café');
    expect((await getSummaries(couple)).lists.map((entry) => entry.id)).toEqual([
      older.id,
      newer.id,
    ]);

    await addItem(couple, newer.id, 'Pão');
    await couple.blue.agent.post(`/api/lists/${older.id}/items/${item.id}/check`).expect(200);
    expect((await getSummaries(couple)).lists.map((entry) => entry.id)).toEqual([
      older.id,
      newer.id,
    ]);
  });

  it('Itens marcados aparecem depois dos abertos', async () => {
    const couple = await makeScenario(app).createCouple({});
    const list = await createList(couple);
    const first = await addItem(couple, list.id, 'Café');
    const second = await addItem(couple, list.id, 'Pão');
    const third = await addItem(couple, list.id, 'Leite');
    await couple.blue.agent.post(`/api/lists/${list.id}/items/${first.id}/check`).expect(200);

    const after = await getList(couple, list.id);
    expect(after.items.map((entry) => entry.id)).toEqual([second.id, third.id, first.id]);
  });

  it('Membro de outro casal acessa, edita ou exclui lista e item deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const list = await createList(couple);
    const item = await addItem(couple, list.id, 'Café');
    const intruder = otherCouple.blue.agent;
    const base = `/api/lists/${list.id}`;
    const itemBase = `${base}/items/${item.id}`;

    const listAttempts = [
      await intruder.get(base),
      await intruder.patch(base).send({ title: 'Invadida' }),
      await intruder.delete(base),
      await intruder.post(`${base}/items`).send({ title: 'X' }),
      await intruder.delete(`${base}/items/checked`),
    ];
    for (const res of listAttempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('LIST_NOT_FOUND');
    }

    const itemAttempts = [
      await intruder.patch(itemBase).send({ title: 'Invadido' }),
      await intruder.post(`${itemBase}/check`),
      await intruder.post(`${itemBase}/uncheck`),
      await intruder.delete(itemBase),
    ];
    for (const res of itemAttempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('LIST_NOT_FOUND');
    }

    const wrongItem = await couple.blue.agent
      .post(`${base}/items/00000000-0000-4000-8000-000000000000/check`)
      .expect(404);
    expect((wrongItem.body as ErrorResponse).code).toBe('LIST_ITEM_NOT_FOUND');

    const untouched = await getList(couple, list.id, 'blue');
    expect(untouched.title).toBe('Mercado');
    expect(untouched.items).toHaveLength(1);
  });

  it('Usuário sem casal acessa as listas', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'sem-casal-listas@teste.com' });
    const agent = await scenario.loginAs(user);

    const res = await agent.get('/api/lists').expect(403);
    expect((res.body as ErrorResponse).code).toBe('COUPLE_REQUIRED');
  });

  it('Visitante acessa as listas', async () => {
    await request(app.getHttpServer()).get('/api/lists').expect(401);
  });
});
