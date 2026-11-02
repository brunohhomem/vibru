import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ErrorResponse, HealthRecord } from '@vibru/shared';
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
});
