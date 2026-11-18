import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type {
  AgendaEvent,
  AgendaResponse,
  AgendaUpcomingResponse,
  ErrorResponse,
  IcsFeedCreated,
} from '@vibru/shared';
import { addDays, bodasName, todayInSaoPaulo } from '@vibru/shared';
import {
  isRouteExcludedFromRequestLog,
  redactIcsToken,
} from '../src/common/logging/logger-options';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { getTestPool, setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Agenda', () => {
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

  async function getMonth(couple: CoupleScenario, month: string): Promise<AgendaResponse> {
    const res = await couple.purple.agent.get(`/api/agenda?month=${month}`).expect(200);
    return res.body as AgendaResponse;
  }

  async function createFeed(couple: CoupleScenario): Promise<string> {
    const res = await couple.blue.agent.post('/api/agenda/ics').expect(201);
    return (res.body as IcsFeedCreated).feedPath;
  }

  function fetchFeed(feedPath: string) {
    return request(app.getHttpServer()).get(feedPath);
  }

  it('Membro cria, edita e remove evento', async () => {
    const couple = await makeScenario(app).createCouple({});

    const created = await couple.blue.agent
      .post('/api/agenda/events')
      .send({ title: 'Jantar', startsOn: '2026-12-10', startTime: '20:30' })
      .expect(201);
    const eventId = (created.body as AgendaEvent).id;

    const seenByPartner = await getMonth(couple, '2026-12');
    expect(seenByPartner.events).toHaveLength(1);
    expect(seenByPartner.events[0]).toMatchObject({
      title: 'Jantar',
      startsOn: '2026-12-10',
      startTime: '20:30',
      notes: null,
    });

    await couple.purple.agent
      .patch(`/api/agenda/events/${eventId}`)
      .send({ startTime: null, notes: 'Reservar mesa' })
      .expect(200);
    const edited = await getMonth(couple, '2026-12');
    expect(edited.events[0]).toMatchObject({ startTime: null, notes: 'Reservar mesa' });

    await couple.blue.agent.delete(`/api/agenda/events/${eventId}`).expect(204);
    const removed = await getMonth(couple, '2026-12');
    expect(removed.events).toHaveLength(0);
  });

  it('Agenda mostra só os eventos do mês, em ordem de dia e hora', async () => {
    const couple = await makeScenario(app).createCouple({});

    for (const event of [
      { title: 'Tarde', startsOn: '2026-12-10', startTime: '18:00' },
      { title: 'Manhã', startsOn: '2026-12-10', startTime: '08:00' },
      { title: 'Último dia', startsOn: '2026-12-31' },
      { title: 'Outro mês', startsOn: '2027-01-01' },
    ]) {
      await couple.blue.agent.post('/api/agenda/events').send(event).expect(201);
    }

    const agenda = await getMonth(couple, '2026-12');
    expect(agenda.events.map((event) => event.title)).toEqual(['Manhã', 'Tarde', 'Último dia']);
  });

  it('Membro salva evento com data, horário ou título inválido', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = '/api/agenda/events';
    const valid = { title: 'Jantar', startsOn: '2026-12-10' };

    await couple.blue.agent
      .post(base)
      .send({ ...valid, startsOn: '10/12/2026' })
      .expect(400);
    await couple.blue.agent
      .post(base)
      .send({ ...valid, startTime: '25:00' })
      .expect(400);
    await couple.blue.agent
      .post(base)
      .send({ ...valid, title: '  ' })
      .expect(400);
  });

  it('Membro consulta mês inválido', async () => {
    const couple = await makeScenario(app).createCouple({});

    await couple.blue.agent.get('/api/agenda?month=2026-13').expect(400);
    await couple.blue.agent.get('/api/agenda').expect(400);
  });

  it('Membro cria, edita e remove data importante', async () => {
    const couple = await makeScenario(app).createCouple({});

    const created = await couple.blue.agent
      .post('/api/agenda/important-dates')
      .send({ title: 'Aniversário da Maria', occursOn: '1960-12-05', repeatsYearly: true })
      .expect(201);
    const dateId = (created.body as { id: string }).id;

    await couple.purple.agent
      .patch(`/api/agenda/important-dates/${dateId}`)
      .send({ title: 'Aniversário da Sogra' })
      .expect(200);
    const edited = await getMonth(couple, '2026-12');
    expect(edited.importantDates[0]).toMatchObject({
      title: 'Aniversário da Sogra',
      occursOn: '1960-12-05',
      date: '2026-12-05',
    });

    await couple.blue.agent.delete(`/api/agenda/important-dates/${dateId}`).expect(204);
    const removed = await getMonth(couple, '2026-12');
    expect(removed.importantDates).toHaveLength(0);
  });

  it('Data anual aparece todo ano e data avulsa só no próprio ano', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = '/api/agenda/important-dates';

    await couple.blue.agent
      .post(base)
      .send({ title: 'Anual', occursOn: '2020-06-15', repeatsYearly: true })
      .expect(201);
    await couple.blue.agent
      .post(base)
      .send({ title: 'Avulsa', occursOn: '2026-06-20', repeatsYearly: false })
      .expect(201);

    const titles = async (month: string) =>
      (await getMonth(couple, month)).importantDates.map((date) => date.title);

    expect(await titles('2026-06')).toEqual(['Anual', 'Avulsa']);
    expect(await titles('2027-06')).toEqual(['Anual']);
    expect(await titles('2019-06')).toEqual([]);
  });

  it('Aniversário em 29/02 consultado num ano não bissexto', async () => {
    const couple = await makeScenario(app).createCouple({});
    await couple.blue.agent
      .post('/api/agenda/important-dates')
      .send({ title: 'Nascido em 29/02', occursOn: '2024-02-29', repeatsYearly: true })
      .expect(201);

    const notLeap = await getMonth(couple, '2027-02');
    expect(notLeap.importantDates[0]?.date).toBe('2027-02-28');

    const leap = await getMonth(couple, '2028-02');
    expect(leap.importantDates[0]?.date).toBe('2028-02-29');
  });

  it('Agenda calcula bodas e aniversário de namoro', async () => {
    const couple = await makeScenario(app).createCouple({
      datingStartedOn: '2015-03-20',
      marriedOn: '2021-03-05',
    });

    const agenda = await getMonth(couple, '2026-03');
    expect(agenda.anniversaries).toEqual([
      {
        kind: 'wedding',
        date: '2026-03-05',
        years: 5,
        title: 'Bodas de Madeira (5 anos)',
      },
      { kind: 'dating', date: '2026-03-20', years: 11, title: '11 anos de namoro' },
    ]);

    const beforeFirstYear = await getMonth(couple, '2021-03');
    expect(beforeFirstYear.anniversaries.map((item) => item.kind)).toEqual(['dating']);
  });

  it('Data do casamento muda', async () => {
    const couple = await makeScenario(app).createCouple({ marriedOn: '2021-03-05' });

    await couple.blue.agent.patch('/api/couple').send({ marriedOn: '2020-04-10' }).expect(200);

    const oldMonth = await getMonth(couple, '2026-03');
    expect(oldMonth.anniversaries).toHaveLength(0);

    const newMonth = await getMonth(couple, '2026-04');
    expect(newMonth.anniversaries[0]).toMatchObject({
      date: '2026-04-10',
      years: 6,
      title: 'Bodas de Perfume (6 anos)',
    });
  });

  it('Membro de outro casal vê, edita ou exclui item deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const event = await couple.blue.agent
      .post('/api/agenda/events')
      .send({ title: 'Jantar', startsOn: '2026-12-10' })
      .expect(201);
    const date = await couple.blue.agent
      .post('/api/agenda/important-dates')
      .send({ title: 'Data', occursOn: '2026-12-11', repeatsYearly: false })
      .expect(201);
    const eventPath = `/api/agenda/events/${(event.body as { id: string }).id}`;
    const datePath = `/api/agenda/important-dates/${(date.body as { id: string }).id}`;
    const intruder = otherCouple.blue.agent;

    const seenByIntruder = await intruder.get('/api/agenda?month=2026-12').expect(200);
    expect((seenByIntruder.body as AgendaResponse).events).toHaveLength(0);
    expect((seenByIntruder.body as AgendaResponse).importantDates).toHaveLength(0);

    const attempts = [
      await intruder.patch(eventPath).send({ title: 'Invadido' }),
      await intruder.delete(eventPath),
      await intruder.patch(datePath).send({ title: 'Invadido' }),
      await intruder.delete(datePath),
      await intruder.delete('/api/agenda/events/nao-e-uuid'),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('AGENDA_ITEM_NOT_FOUND');
    }

    const untouched = await getMonth(couple, '2026-12');
    expect(untouched.events[0]?.title).toBe('Jantar');
    expect(untouched.importantDates[0]?.title).toBe('Data');
  });

  it('Usuário sem casal e visitante acessam a agenda', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'solteiro@teste.com' });
    const agent = await scenario.loginAs(user);

    const withoutCouple = await agent.get('/api/agenda?month=2026-12').expect(403);
    expect((withoutCouple.body as ErrorResponse).code).toBe('COUPLE_REQUIRED');

    await request(app.getHttpServer()).get('/api/agenda?month=2026-12').expect(401);
    await request(app.getHttpServer()).post('/api/agenda/ics').expect(401);
  });

  it('Calendário busca o feed com token válido', async () => {
    const couple = await makeScenario(app).createCouple({ marriedOn: '2021-03-05' });
    const year = Number(todayInSaoPaulo(new Date()).slice(0, 4));
    const feedPath = await createFeed(couple);

    await couple.blue.agent
      .post('/api/agenda/events')
      .send({
        title: 'Jantar, com vinho',
        startsOn: `${year}-12-10`,
        startTime: '20:30',
        notes: 'Nota íntima',
      })
      .expect(201);
    await couple.blue.agent
      .post('/api/agenda/important-dates')
      .send({ title: 'Aniversário da Maria', occursOn: '1960-12-05', repeatsYearly: true })
      .expect(201);
    await couple.blue.agent
      .post('/api/tasks')
      .send({ title: 'Tarefa secreta', assigneeMemberId: null, dueOn: `${year}-12-10` })
      .expect(201);
    await couple.blue.agent
      .post(`/api/health/members/${couple.blue.memberId}/medications`)
      .send({ name: 'Losartana', times: ['08:00'] })
      .expect(201);
    await couple.blue.agent
      .post(`/api/health/members/${couple.blue.memberId}/events`)
      .send({ kind: 'exam', occurredOn: `${year}-12-10`, title: 'Hemograma' })
      .expect(201);

    const res = await fetchFeed(feedPath).expect(200);
    const feed = res.text;

    expect(res.headers['content-type']).toContain('text/calendar');
    expect(feed.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(feed.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(feed).toContain('SUMMARY:Jantar\\, com vinho');
    expect(feed).toContain(`DTSTART;TZID=America/Sao_Paulo:${year}1210T203000`);
    expect(feed).toContain('SUMMARY:Aniversário da Maria');
    expect(feed).toContain(`DTSTART;VALUE=DATE:${year}1205`);
    expect(feed).toContain(`SUMMARY:Bodas de ${bodasName(year - 2021) ?? ''}`);

    expect(feed).not.toContain('Nota íntima');
    expect(feed).not.toContain('Tarefa secreta');
    expect(feed).not.toContain('Losartana');
    expect(feed).not.toContain('Hemograma');
  });

  it('Calendário busca com token revogado ou inexistente', async () => {
    const couple = await makeScenario(app).createCouple({});
    const feedPath = await createFeed(couple);
    await fetchFeed(feedPath).expect(200);

    await couple.blue.agent.delete('/api/agenda/ics').expect(204);

    await fetchFeed(feedPath).expect(404);
    await fetchFeed(`/api/ics/${'a'.repeat(43)}.ics`).expect(404);
    await fetchFeed('/api/ics/sem-extensao').expect(404);
  });

  it('Membro regenera o token', async () => {
    const couple = await makeScenario(app).createCouple({});
    const firstPath = await createFeed(couple);

    const secondPath = await createFeed(couple);

    expect(secondPath).not.toBe(firstPath);
    await fetchFeed(firstPath).expect(404);
    await fetchFeed(secondPath).expect(200);
  });

  it('Cada membro tem o próprio token', async () => {
    const couple = await makeScenario(app).createCouple({});
    const bluePath = await createFeed(couple);
    const purple = await couple.purple.agent.post('/api/agenda/ics').expect(201);
    const purplePath = (purple.body as IcsFeedCreated).feedPath;

    await couple.purple.agent.delete('/api/agenda/ics').expect(204);

    await fetchFeed(bluePath).expect(200);
    await fetchFeed(purplePath).expect(404);
  });

  it('Membro consulta se o feed está ativo', async () => {
    const couple = await makeScenario(app).createCouple({});
    const isActive = async () => {
      const res = await couple.blue.agent.get('/api/agenda/ics').expect(200);
      return (res.body as { active: boolean }).active;
    };

    expect(await isActive()).toBe(false);
    await createFeed(couple);
    expect(await isActive()).toBe(true);
    await couple.blue.agent.delete('/api/agenda/ics').expect(204);
    expect(await isActive()).toBe(false);
  });

  it('Token do feed fica só como hash no banco e fora do log', async () => {
    const couple = await makeScenario(app).createCouple({});
    const feedPath = await createFeed(couple);
    const token = feedPath.replace('/api/ics/', '').replace('.ics', '');

    const stored = await getTestPool().query<{ icsTokenHash: string }>(
      'SELECT ics_token_hash AS "icsTokenHash" FROM couple_members WHERE id = $1',
      [couple.blue.memberId],
    );

    expect(token).toHaveLength(43);
    expect(stored.rows[0]?.icsTokenHash).toHaveLength(64);
    expect(stored.rows[0]?.icsTokenHash).not.toContain(token);
    expect(isRouteExcludedFromRequestLog(feedPath)).toBe(true);
    expect(redactIcsToken(feedPath)).not.toContain(token);
  });

  describe('Próxima data', () => {
    const today = () => todayInSaoPaulo(new Date());

    async function getUpcoming(couple: CoupleScenario): Promise<AgendaUpcomingResponse> {
      const res = await couple.blue.agent.get('/api/agenda/upcoming').expect(200);
      return res.body as AgendaUpcomingResponse;
    }

    it('Próxima data é o aniversário de amanhã', async () => {
      const couple = await makeScenario(app).createCouple({});
      const tomorrow = addDays(today(), 1);
      await couple.blue.agent
        .post('/api/agenda/important-dates')
        .send({ title: 'Aniversário da Ana', occursOn: tomorrow, repeatsYearly: true })
        .expect(201);
      await couple.blue.agent
        .post('/api/agenda/events')
        .send({ title: 'Depois', startsOn: addDays(today(), 3) })
        .expect(201);

      const upcoming = await getUpcoming(couple);
      expect(upcoming.today).toBe(today());
      expect(upcoming.next).toEqual({
        kind: 'important_date',
        date: tomorrow,
        title: 'Aniversário da Ana',
        daysUntil: 1,
      });
    });

    it('Evento hoje', async () => {
      const couple = await makeScenario(app).createCouple({});
      await couple.blue.agent
        .post('/api/agenda/events')
        .send({ title: 'Piquenique', startsOn: today(), startTime: '19:00' })
        .expect(201);

      expect((await getUpcoming(couple)).next).toMatchObject({
        kind: 'event',
        title: 'Piquenique',
        daysUntil: 0,
      });
    });

    it('No mesmo dia, bodas vêm antes do evento e o evento sem horário antes do com horário', async () => {
      const fiveYearsAgo = `${Number(today().slice(0, 4)) - 5}${today().slice(4)}`;
      const couple = await makeScenario(app).createCouple({ marriedOn: fiveYearsAgo });
      const eventsAt = async (startTime: string | null, title: string) =>
        couple.blue.agent
          .post('/api/agenda/events')
          .send({ title, startsOn: today(), startTime })
          .expect(201);
      await eventsAt('08:00', 'Com horário');
      await eventsAt(null, 'Sem horário');

      expect((await getUpcoming(couple)).next).toMatchObject({ kind: 'wedding', daysUntil: 0 });

      await couple.blue.agent.patch('/api/couple').send({ marriedOn: null }).expect(200);
      expect((await getUpcoming(couple)).next?.title).toBe('Sem horário');
    });

    it('Nada nos próximos 365 dias', async () => {
      const couple = await makeScenario(app).createCouple({});
      await couple.blue.agent
        .post('/api/agenda/events')
        .send({ title: 'Longe', startsOn: addDays(today(), 366) })
        .expect(201);
      await couple.blue.agent
        .post('/api/agenda/events')
        .send({ title: 'Passou', startsOn: addDays(today(), -1) })
        .expect(201);

      expect(await getUpcoming(couple)).toEqual({ today: today(), next: null });
    });
  });
});
