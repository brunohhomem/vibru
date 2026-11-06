import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type {
  CompleteTaskResponse,
  ErrorResponse,
  HealthMembersResponse,
  HealthRecord,
  ListsResponse,
  Medication,
  PharmacyResult,
  Task,
  TasksResponse,
} from '@vibru/shared';
import { todayInSaoPaulo } from '@vibru/shared';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Saúde', () => {
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

  async function getRecord(
    couple: CoupleScenario,
    memberId: string,
    as: 'blue' | 'purple' = 'purple',
  ): Promise<HealthRecord> {
    const res = await couple[as].agent.get(`/api/health/members/${memberId}`).expect(200);
    return res.body as HealthRecord;
  }

  it('Membro preenche a própria ficha', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;

    await couple.blue.agent
      .put(`${base}/profile`)
      .send({
        bloodType: 'O+',
        organDonor: true,
        healthPlanName: 'Plano Saúde',
        healthPlanNumber: '123456',
        preferredHospital: 'Hospital Central',
      })
      .expect(200);

    const seenByPartner = await getRecord(couple, couple.blue.memberId);
    expect(seenByPartner.profile).toMatchObject({
      bloodType: 'O+',
      organDonor: true,
      healthPlanName: 'Plano Saúde',
      preferredHospital: 'Hospital Central',
    });
  });

  it('Membro edita a ficha da parceira', async () => {
    const couple = await makeScenario(app).createCouple({});
    const partnerBase = `/api/health/members/${couple.purple.memberId}`;

    await couple.blue.agent.put(`${partnerBase}/profile`).send({ bloodType: 'A-' }).expect(200);
    await couple.blue.agent
      .post(`${partnerBase}/allergies`)
      .send({ substance: 'Dipirona', severity: 'severe' })
      .expect(201);

    const seenByOwner = await getRecord(couple, couple.purple.memberId, 'purple');
    expect(seenByOwner.profile.bloodType).toBe('A-');
    expect(seenByOwner.allergies).toHaveLength(1);
    expect(seenByOwner.memberName).toBeTruthy();
  });

  it('Membro salva tipo sanguíneo inválido', async () => {
    const couple = await makeScenario(app).createCouple({});
    const res = await couple.blue.agent
      .put(`/api/health/members/${couple.blue.memberId}/profile`)
      .send({ bloodType: 'Z+' })
      .expect(400);

    expect((res.body as ErrorResponse).details?.[0]?.path).toEqual(['bloodType']);
  });

  it('Membro adiciona, edita e remove alergia, condição, contato e médico', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const agent = couple.blue.agent;

    const mild = await agent
      .post(`${base}/allergies`)
      .send({ substance: 'Poeira', severity: 'mild' })
      .expect(201);
    const severe = await agent
      .post(`${base}/allergies`)
      .send({ substance: 'Amendoim', reaction: 'Choque', severity: 'severe' })
      .expect(201);
    const condition = await agent
      .post(`${base}/conditions`)
      .send({ name: 'Hipertensão', sinceOn: '2020-05-10' })
      .expect(201);
    const contact = await agent
      .post(`${base}/contacts`)
      .send({ name: 'Maria', relationship: 'Mãe', phone: '(11) 91234-5678' })
      .expect(201);
    const doctor = await agent
      .post(`${base}/doctors`)
      .send({ name: 'Dra. Ana', specialty: 'Cardiologia' })
      .expect(201);

    const created = await getRecord(couple, couple.blue.memberId);
    expect(created.allergies.map((item) => item.substance)).toEqual(['Amendoim', 'Poeira']);
    expect(created.conditions[0]).toMatchObject({ name: 'Hipertensão', sinceOn: '2020-05-10' });
    expect(created.contacts[0]?.phone).toBe('11912345678');
    expect(created.doctors[0]?.specialty).toBe('Cardiologia');

    await agent
      .patch(`${base}/allergies/${(mild.body as { id: string }).id}`)
      .send({ severity: 'moderate' })
      .expect(200);
    await agent
      .patch(`${base}/conditions/${(condition.body as { id: string }).id}`)
      .send({ name: 'Hipertensão arterial' })
      .expect(200);
    await agent
      .patch(`${base}/contacts/${(contact.body as { id: string }).id}`)
      .send({ relationship: 'Mãe da Ana' })
      .expect(200);
    await agent
      .patch(`${base}/doctors/${(doctor.body as { id: string }).id}`)
      .send({ phone: '1133334444' })
      .expect(200);

    const edited = await getRecord(couple, couple.blue.memberId);
    expect(edited.allergies.map((item) => item.severity)).toEqual(['severe', 'moderate']);
    expect(edited.conditions[0]?.name).toBe('Hipertensão arterial');
    expect(edited.contacts[0]?.relationship).toBe('Mãe da Ana');
    expect(edited.doctors[0]?.phone).toBe('1133334444');

    await agent.delete(`${base}/allergies/${(severe.body as { id: string }).id}`).expect(204);
    await agent.delete(`${base}/conditions/${(condition.body as { id: string }).id}`).expect(204);
    await agent.delete(`${base}/contacts/${(contact.body as { id: string }).id}`).expect(204);
    await agent.delete(`${base}/doctors/${(doctor.body as { id: string }).id}`).expect(204);

    const removed = await getRecord(couple, couple.blue.memberId);
    expect(removed.allergies).toHaveLength(1);
    expect(removed.conditions).toEqual([]);
    expect(removed.contacts).toEqual([]);
    expect(removed.doctors).toEqual([]);
  });

  it('Membro adiciona contato sem telefone', async () => {
    const couple = await makeScenario(app).createCouple({});
    const res = await couple.blue.agent
      .post(`/api/health/members/${couple.blue.memberId}/contacts`)
      .send({ name: 'Maria', relationship: 'Mãe' })
      .expect(400);

    expect((res.body as ErrorResponse).details?.[0]?.path).toEqual(['phone']);
  });

  it('Membro de outro casal acessa, edita ou exclui ficha e item deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const allergy = await couple.blue.agent
      .post(`${base}/allergies`)
      .send({ substance: 'Amendoim', severity: 'severe' })
      .expect(201);
    const allergyId = (allergy.body as { id: string }).id;
    const intruder = otherCouple.blue.agent;

    const memberAttempts = [
      await intruder.get(base),
      await intruder.put(`${base}/profile`).send({ bloodType: 'O+' }),
      await intruder.post(`${base}/allergies`).send({ substance: 'X', severity: 'mild' }),
      await intruder.patch(`${base}/allergies/${allergyId}`).send({ severity: 'mild' }),
      await intruder.delete(`${base}/allergies/${allergyId}`),
    ];
    for (const res of memberAttempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('HEALTH_MEMBER_NOT_FOUND');
    }

    const missingItem = await couple.blue.agent
      .delete(`${base}/allergies/00000000-0000-4000-8000-000000000000`)
      .expect(404);
    expect((missingItem.body as ErrorResponse).code).toBe('HEALTH_ITEM_NOT_FOUND');

    const untouched = await getRecord(couple, couple.blue.memberId, 'blue');
    expect(untouched.allergies).toHaveLength(1);
  });

  it('Usuário sem casal acessa a ficha', async () => {
    const scenario = makeScenario(app);
    const user = await scenario.createUser({ email: 'sem-casal-saude@teste.com' });
    const agent = await scenario.loginAs(user);

    const res = await agent
      .get('/api/health/members/00000000-0000-4000-8000-000000000000')
      .expect(403);
    expect((res.body as ErrorResponse).code).toBe('COUPLE_REQUIRED');
  });

  it('Visitante acessa a ficha', async () => {
    await request(app.getHttpServer())
      .get('/api/health/members/00000000-0000-4000-8000-000000000000')
      .expect(401);
  });

  async function createMedication(
    couple: CoupleScenario,
    data: Record<string, unknown> = {},
  ): Promise<Medication> {
    const res = await couple.blue.agent
      .post(`/api/health/members/${couple.blue.memberId}/medications`)
      .send({ name: 'Losartana', dosage: '50 mg', times: ['08:00'], ...data })
      .expect(201);

    return res.body as Medication;
  }

  async function listTasks(couple: CoupleScenario): Promise<TasksResponse> {
    const res = await couple.blue.agent.get('/api/tasks').expect(200);
    return res.body as TasksResponse;
  }

  async function medicationTasks(couple: CoupleScenario, medicationId: string): Promise<Task[]> {
    const tasks = await listTasks(couple);
    return tasks.open.filter((task) => task.medicationId === medicationId);
  }

  async function completeTask(
    couple: CoupleScenario,
    taskId: string,
  ): Promise<CompleteTaskResponse> {
    const res = await couple.blue.agent.post(`/api/tasks/${taskId}/complete`).expect(200);
    return res.body as CompleteTaskResponse;
  }

  async function stockOf(couple: CoupleScenario, medicationId: string): Promise<number | null> {
    const record = await getRecord(couple, couple.blue.memberId, 'blue');
    return record.medications.find((item) => item.id === medicationId)?.stockUnits ?? null;
  }

  it('Membro cria remédio com dois horários', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { times: ['20:00', '08:00'] });

    expect(medication.times).toEqual(['08:00', '20:00']);

    const tasks = await medicationTasks(couple, medication.id);
    expect(tasks.map((task) => task.dueTime)).toEqual(['08:00', '20:00']);
    for (const task of tasks) {
      expect(task).toMatchObject({
        title: 'Tomar Losartana 50 mg',
        category: 'health',
        assigneeMemberId: couple.blue.memberId,
        dueOn: todayInSaoPaulo(new Date()),
        recurrence: { kind: 'daily', interval: 1 },
      });
    }
  });

  it('Membro cria remédio "quando precisar"', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { times: [] });

    expect(await medicationTasks(couple, medication.id)).toEqual([]);
    const record = await getRecord(couple, couple.blue.memberId);
    expect(record.medications.map((item) => item.id)).toEqual([medication.id]);
  });

  it('Membro muda os horários do remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { times: ['08:00', '20:00'] });
    const before = await medicationTasks(couple, medication.id);
    const morningTask = before.find((task) => task.dueTime === '08:00');

    await couple.blue.agent
      .patch(`/api/health/medications/${medication.id}`)
      .send({ times: ['08:00', '12:00'] })
      .expect(200);

    const after = await medicationTasks(couple, medication.id);
    expect(after.map((task) => task.dueTime)).toEqual(['08:00', '12:00']);
    expect(after.find((task) => task.dueTime === '08:00')?.id).toBe(morningTask?.id);
  });

  it('Membro renomeia o remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple);

    await couple.blue.agent
      .patch(`/api/health/medications/${medication.id}`)
      .send({ name: 'Enalapril', dosage: '10 mg' })
      .expect(200);

    const tasks = await medicationTasks(couple, medication.id);
    expect(tasks.map((task) => task.title)).toEqual(['Tomar Enalapril 10 mg']);
  });

  it('Membro desativa o remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { times: ['08:00', '20:00'] });
    const [first] = await medicationTasks(couple, medication.id);
    await completeTask(couple, first?.id ?? '');

    await couple.blue.agent.delete(`/api/health/medications/${medication.id}`).expect(204);

    expect(await medicationTasks(couple, medication.id)).toEqual([]);
    const tasks = await listTasks(couple);
    expect(tasks.completedThisWeek.map((task) => task.id)).toContain(first?.id);
    const record = await getRecord(couple, couple.blue.memberId);
    expect(record.medications).toEqual([]);
  });

  it('Membro edita título, responsável, prazo ou exclui tarefa de remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple);
    const [task] = await medicationTasks(couple, medication.id);
    const path = `/api/tasks/${task?.id}`;

    const attempts = [
      await couple.blue.agent.patch(path).send({ title: 'Outro título' }),
      await couple.blue.agent.patch(path).send({ assigneeMemberId: null }),
      await couple.blue.agent.patch(path).send({ dueOn: '2030-01-01' }),
      await couple.blue.agent.patch(path).send({ category: 'home' }),
      await couple.blue.agent.delete(path),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).code).toBe('TASK_MEDICATION_LOCKED');
    }
  });

  it('Membro edita só as notas da tarefa de remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple);
    const [task] = await medicationTasks(couple, medication.id);

    const res = await couple.blue.agent
      .patch(`/api/tasks/${task?.id}`)
      .send({ notes: 'Depois do café' })
      .expect(200);

    expect(res.body).toMatchObject({ notes: 'Depois do café', title: 'Tomar Losartana 50 mg' });
  });

  it('Membro conclui tarefa de remédio com estoque', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { stockUnits: 10, unitsPerDose: 2 });
    const [task] = await medicationTasks(couple, medication.id);

    const result = await completeTask(couple, task?.id ?? '');

    expect(await stockOf(couple, medication.id)).toBe(8);
    expect(result.next?.medicationId).toBe(medication.id);
    expect((result.next?.dueOn ?? '') > todayInSaoPaulo(new Date())).toBe(true);
  });

  it('Membro desfaz a conclusão da tarefa de remédio', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { stockUnits: 10, unitsPerDose: 2 });
    const [task] = await medicationTasks(couple, medication.id);
    await completeTask(couple, task?.id ?? '');

    await couple.blue.agent.post(`/api/tasks/${task?.id}/reopen`).expect(200);

    expect(await stockOf(couple, medication.id)).toBe(10);
    expect(await medicationTasks(couple, medication.id)).toHaveLength(1);
  });

  it('Estoque chega a 0 e a conclusão continua', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, { stockUnits: 1, unitsPerDose: 1 });
    const [task] = await medicationTasks(couple, medication.id);

    const first = await completeTask(couple, task?.id ?? '');
    expect(await stockOf(couple, medication.id)).toBe(0);

    await completeTask(couple, first.next?.id ?? '');
    expect(await stockOf(couple, medication.id)).toBe(0);
  });

  it('Conclusão deixa o estoque abaixo do limite', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, {
      times: ['08:00', '20:00'],
      stockUnits: 15,
      lowStockDays: 7,
    });
    const [morning, evening] = await medicationTasks(couple, medication.id);

    const first = await completeTask(couple, morning?.id ?? '');
    const second = await completeTask(couple, evening?.id ?? '');

    expect(first.lowStock).toEqual({
      medicationId: medication.id,
      name: 'Losartana',
      daysLeft: 7,
    });
    expect(second.lowStock).toBeNull();
  });

  it('Membro repõe o estoque e volta a ficar baixo', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple, {
      times: ['08:00', '20:00'],
      stockUnits: 15,
      lowStockDays: 7,
    });
    const [morning, evening] = await medicationTasks(couple, medication.id);
    const first = await completeTask(couple, morning?.id ?? '');
    await completeTask(couple, evening?.id ?? '');
    expect(first.lowStock).not.toBeNull();

    await couple.blue.agent
      .patch(`/api/health/medications/${medication.id}`)
      .send({ stockUnits: 15 })
      .expect(200);
    const third = await completeTask(couple, first.next?.id ?? '');

    expect(third.lowStock).toMatchObject({ medicationId: medication.id, daysLeft: 7 });
  });

  it('Membro adiciona o remédio à Farmácia', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple);

    const first = await couple.blue.agent
      .post(`/api/health/medications/${medication.id}/pharmacy`)
      .expect(200);
    const again = await couple.purple.agent
      .post(`/api/health/medications/${medication.id}/pharmacy`)
      .expect(200);

    expect((first.body as PharmacyResult).alreadyListed).toBe(false);
    expect((again.body as PharmacyResult).alreadyListed).toBe(true);
    const lists = (await couple.blue.agent.get('/api/lists').expect(200)).body as ListsResponse;
    expect(lists.lists).toEqual([
      expect.objectContaining({ title: 'Farmácia', totalItems: 1, checkedItems: 0 }),
    ]);
  });

  it('Membro usa a Farmácia que já existe com outro caixa ("farmácia")', async () => {
    const couple = await makeScenario(app).createCouple({});
    const medication = await createMedication(couple);
    const existing = await couple.blue.agent
      .post('/api/lists')
      .send({ title: 'farmacia' })
      .expect(201);

    const res = await couple.blue.agent
      .post(`/api/health/medications/${medication.id}/pharmacy`)
      .expect(200);

    expect((res.body as PharmacyResult).list.id).toBe((existing.body as { id: string }).id);
    const lists = (await couple.blue.agent.get('/api/lists').expect(200)).body as ListsResponse;
    expect(lists.lists).toHaveLength(1);
  });

  it('Membro lista os membros do casal com a contagem de remédios', async () => {
    const couple = await makeScenario(app).createCouple({});
    await createMedication(couple);

    const res = await couple.purple.agent.get('/api/health/members').expect(200);
    const body = res.body as HealthMembersResponse;

    expect(body.members).toHaveLength(2);
    expect(body.members.find((item) => item.memberId === couple.blue.memberId)).toMatchObject({
      medicationCount: 1,
    });
    expect(body.members.find((item) => item.memberId === couple.purple.memberId)).toMatchObject({
      medicationCount: 0,
    });
  });

  it('Membro registra, edita e remove evento do histórico', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const doctor = await couple.blue.agent
      .post(`${base}/doctors`)
      .send({ name: 'Dra. Ana' })
      .expect(201);
    const doctorId = (doctor.body as { id: string }).id;

    const created = await couple.blue.agent
      .post(`${base}/events`)
      .send({ kind: 'exam', occurredOn: '2026-03-10', title: 'Hemograma', doctorId })
      .expect(201);
    const eventId = (created.body as { id: string }).id;

    const seenByPartner = await getRecord(couple, couple.blue.memberId);
    expect(seenByPartner.events).toHaveLength(1);
    expect(seenByPartner.events[0]).toMatchObject({
      kind: 'exam',
      occurredOn: '2026-03-10',
      title: 'Hemograma',
      doctorId,
      notes: null,
    });

    await couple.purple.agent
      .patch(`${base}/events/${eventId}`)
      .send({ kind: 'appointment', doctorId: null, notes: 'Retorno em seis meses' })
      .expect(200);
    const edited = await getRecord(couple, couple.blue.memberId, 'blue');
    expect(edited.events[0]).toMatchObject({
      kind: 'appointment',
      title: 'Hemograma',
      doctorId: null,
      notes: 'Retorno em seis meses',
    });

    await couple.blue.agent.delete(`${base}/events/${eventId}`).expect(204);
    const removed = await getRecord(couple, couple.blue.memberId, 'blue');
    expect(removed.events).toHaveLength(0);
  });

  it('Histórico vem do evento mais recente para o mais antigo', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;

    for (const [occurredOn, title] of [
      ['2024-01-15', 'Vacina da gripe'],
      ['2026-02-20', 'Consulta'],
      ['2025-07-01', 'Cirurgia'],
    ]) {
      await couple.blue.agent
        .post(`${base}/events`)
        .send({ kind: 'appointment', occurredOn, title })
        .expect(201);
    }

    const record = await getRecord(couple, couple.blue.memberId);
    expect(record.events.map((event) => event.title)).toEqual([
      'Consulta',
      'Cirurgia',
      'Vacina da gripe',
    ]);
  });

  it('Membro salva evento com tipo, data ou título inválido', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}/events`;
    const valid = { kind: 'exam', occurredOn: '2026-03-10', title: 'Hemograma' };

    await couple.blue.agent
      .post(base)
      .send({ ...valid, kind: 'party' })
      .expect(400);
    await couple.blue.agent
      .post(base)
      .send({ ...valid, occurredOn: '10/03/2026' })
      .expect(400);
    await couple.blue.agent
      .post(base)
      .send({ ...valid, title: '  ' })
      .expect(400);

    const record = await getRecord(couple, couple.blue.memberId);
    expect(record.events).toHaveLength(0);
  });

  it('Membro vincula evento a médico de outra pessoa ou de outro casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const event = { kind: 'appointment', occurredOn: '2026-03-10', title: 'Consulta' };

    const partnerDoctor = await couple.purple.agent
      .post(`/api/health/members/${couple.purple.memberId}/doctors`)
      .send({ name: 'Dr. Paulo' })
      .expect(201);
    const foreignDoctor = await otherCouple.blue.agent
      .post(`/api/health/members/${otherCouple.blue.memberId}/doctors`)
      .send({ name: 'Dra. Eva' })
      .expect(201);
    const saved = await couple.blue.agent.post(`${base}/events`).send(event).expect(201);
    const eventId = (saved.body as { id: string }).id;

    const attempts = [
      await couple.blue.agent
        .post(`${base}/events`)
        .send({ ...event, doctorId: (partnerDoctor.body as { id: string }).id }),
      await couple.blue.agent
        .post(`${base}/events`)
        .send({ ...event, doctorId: (foreignDoctor.body as { id: string }).id }),
      await couple.blue.agent
        .patch(`${base}/events/${eventId}`)
        .send({ doctorId: (foreignDoctor.body as { id: string }).id }),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('HEALTH_ITEM_NOT_FOUND');
    }

    const record = await getRecord(couple, couple.blue.memberId, 'blue');
    expect(record.events).toHaveLength(1);
    expect(record.events[0]?.doctorId).toBeNull();
  });

  it('Membro remove o médico de um evento do histórico', async () => {
    const couple = await makeScenario(app).createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const doctor = await couple.blue.agent
      .post(`${base}/doctors`)
      .send({ name: 'Dra. Ana' })
      .expect(201);
    const doctorId = (doctor.body as { id: string }).id;
    await couple.blue.agent
      .post(`${base}/events`)
      .send({ kind: 'surgery', occurredOn: '2025-01-10', title: 'Apendicite', doctorId })
      .expect(201);

    await couple.blue.agent.delete(`${base}/doctors/${doctorId}`).expect(204);

    const record = await getRecord(couple, couple.blue.memberId);
    expect(record.doctors).toHaveLength(0);
    expect(record.events[0]).toMatchObject({ title: 'Apendicite' });
  });

  it('Membro de outro casal cria, edita ou exclui evento deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const base = `/api/health/members/${couple.blue.memberId}`;
    const event = { kind: 'vaccine', occurredOn: '2026-03-10', title: 'Vacina da gripe' };
    const saved = await couple.blue.agent.post(`${base}/events`).send(event).expect(201);
    const eventId = (saved.body as { id: string }).id;
    const intruder = otherCouple.blue.agent;

    const attempts = [
      await intruder.post(`${base}/events`).send(event),
      await intruder.patch(`${base}/events/${eventId}`).send({ title: 'Invadido' }),
      await intruder.delete(`${base}/events/${eventId}`),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('HEALTH_MEMBER_NOT_FOUND');
    }

    const record = await getRecord(couple, couple.blue.memberId, 'blue');
    expect(record.events).toHaveLength(1);
    expect(record.events[0]?.title).toBe('Vacina da gripe');
  });

  it('Membro de outro casal acessa, edita ou exclui remédio deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const medication = await createMedication(couple);
    const intruder = otherCouple.blue.agent;

    const attempts = [
      await intruder.patch(`/api/health/medications/${medication.id}`).send({ name: 'Invadido' }),
      await intruder.delete(`/api/health/medications/${medication.id}`),
      await intruder.post(`/api/health/medications/${medication.id}/pharmacy`),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).code).toBe('MEDICATION_NOT_FOUND');
    }

    const create = await intruder
      .post(`/api/health/members/${couple.blue.memberId}/medications`)
      .send({ name: 'Invadido' })
      .expect(404);
    expect((create.body as ErrorResponse).code).toBe('HEALTH_MEMBER_NOT_FOUND');
    expect(await medicationTasks(couple, medication.id)).toHaveLength(1);
  });
});
