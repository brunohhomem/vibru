import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { ErrorResponse, Task, TasksResponse } from '@vibru/shared';
import {
  addCalendarDays,
  addRecurrence,
  daysInMonth,
  formatCalendarDate,
  parseCalendarDate,
  todayInSaoPaulo,
} from '@vibru/shared';
import { closeTestApp, createTestApp, resetDatabase, resetThrottle } from './integration-utils';
import { getTestPool, setupTestDatabase, teardownTestDatabase } from './integration-setup';
import { makeScenario, type CoupleScenario } from './scenario';

describe('Tarefas', () => {
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

  async function createTask(couple: CoupleScenario, data: Record<string, unknown>): Promise<Task> {
    const res = await couple.blue.agent
      .post('/api/tasks')
      .send({ title: 'Tarefa', assigneeMemberId: null, ...data })
      .expect(201);

    return res.body as Task;
  }

  async function listTasks(couple: CoupleScenario): Promise<TasksResponse> {
    const res = await couple.blue.agent.get('/api/tasks').expect(200);
    return res.body as TasksResponse;
  }

  it('Membro cria tarefa sem responsável', async () => {
    const couple = await makeScenario(app).createCouple({});
    const task = await createTask(couple, { title: 'Comprar pão', assigneeMemberId: null });

    expect(task.assigneeMemberId).toBeNull();

    const blueList = await listTasks(couple);
    const purpleList = await listTasks(couple);
    expect(blueList.open.map((item) => item.id)).toContain(task.id);
    expect(purpleList.open.map((item) => item.id)).toContain(task.id);
  });

  it('Membro cria tarefa para a parceira', async () => {
    const couple = await makeScenario(app).createCouple({});
    const task = await createTask(couple, {
      title: 'Ligar para o buffet',
      assigneeMemberId: couple.purple.memberId,
    });

    const purpleRes = await couple.purple.agent.get('/api/tasks').expect(200);
    const purpleList = purpleRes.body as TasksResponse;
    const found = purpleList.open.find((item) => item.id === task.id);

    expect(found?.assigneeMemberId).toBe(couple.purple.memberId);
  });

  it('Membro atribui tarefa a um membro de outro casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});

    const res = await couple.blue.agent
      .post('/api/tasks')
      .send({
        title: 'Tarefa alheia',
        assigneeMemberId: otherCouple.purple.memberId,
      })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.code).toBe('TASK_ASSIGNEE_INVALID');
    expect(body.details?.[0]?.path).toContain('assigneeMemberId');
  });

  it('Membro de outro casal busca, edita, conclui ou exclui uma tarefa deste casal', async () => {
    const scenario = makeScenario(app);
    const couple = await scenario.createCouple({});
    const otherCouple = await scenario.createCouple({});
    const task = await createTask(couple, { title: 'Tarefa do casal' });

    const edit = await otherCouple.blue.agent
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Invadida' })
      .expect(404);
    expect((edit.body as ErrorResponse).code).toBe('TASK_NOT_FOUND');

    const complete = await otherCouple.blue.agent
      .post(`/api/tasks/${task.id}/complete`)
      .expect(404);
    expect((complete.body as ErrorResponse).code).toBe('TASK_NOT_FOUND');

    const remove = await otherCouple.blue.agent.delete(`/api/tasks/${task.id}`).expect(404);
    expect((remove.body as ErrorResponse).code).toBe('TASK_NOT_FOUND');

    const list = await listTasks(couple);
    expect(list.open.map((item) => item.id)).toContain(task.id);
  });

  it('Membro cria tarefa recorrente sem prazo', async () => {
    const couple = await makeScenario(app).createCouple({});

    const res = await couple.blue.agent
      .post('/api/tasks')
      .send({
        title: 'Toda semana',
        assigneeMemberId: null,
        recurrence: { kind: 'weekly', interval: 1 },
      })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.details?.[0]?.path).toContain('dueOn');
  });

  it('Membro conclui uma tarefa semanal atrasada', async () => {
    const couple = await makeScenario(app).createCouple({});
    const today = todayInSaoPaulo(new Date());
    const dueOn = addCalendarDays(today, -3);
    const task = await createTask(couple, {
      title: 'Semanal atrasada',
      assigneeMemberId: couple.purple.memberId,
      dueOn,
      recurrence: { kind: 'weekly', interval: 1 },
    });

    const res = await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);
    const result = res.body as { completed: Task; next: Task | null };

    expect(result.completed.completedByMemberId).toBe(couple.blue.memberId);
    expect(result.next?.dueOn).toBe(addCalendarDays(dueOn, 7));
  });

  it('Membro conclui uma tarefa semanal adiantada', async () => {
    const couple = await makeScenario(app).createCouple({});
    const today = todayInSaoPaulo(new Date());
    const dueOn = addCalendarDays(today, 5);
    const task = await createTask(couple, {
      title: 'Semanal adiantada',
      dueOn,
      recurrence: { kind: 'weekly', interval: 1 },
    });

    const res = await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);
    const result = res.body as { completed: Task; next: Task | null };

    expect(result.next?.dueOn).toBe(addCalendarDays(dueOn, 7));
  });

  it('Membro conclui uma tarefa mensal com âncora no dia 31 em novembro', async () => {
    const couple = await makeScenario(app).createCouple({});
    const today = todayInSaoPaulo(new Date());
    const transition = monthlyTransitionAfter(today);

    const inserted = await getTestPool().query<{ id: string }>(
      `INSERT INTO tasks (couple_id, title, assignee_member_id, due_on, recurrence_kind, recurrence_interval, recurrence_anchor_on)
       VALUES ($1, $2, $3, $4, 'monthly'::task_recurrence, 1, $5)
       RETURNING id`,
      [couple.coupleId, 'Mensal dia 31', couple.blue.memberId, transition.due, transition.anchor],
    );
    const taskId = inserted.rows[0]?.id;
    if (!taskId) throw new Error('Falha ao inserir tarefa mensal no cenário');

    const res = await couple.blue.agent.post(`/api/tasks/${taskId}/complete`).expect(200);
    const result = res.body as { completed: Task; next: Task | null };

    expect(result.next?.dueOn).toBe(transition.expected);
  });

  it('Membro desfaz a conclusão de uma recorrente cuja próxima não foi tocada', async () => {
    const couple = await makeScenario(app).createCouple({});
    const today = todayInSaoPaulo(new Date());
    const task = await createTask(couple, {
      title: 'Semanal desfeita',
      dueOn: today,
      recurrence: { kind: 'weekly', interval: 1 },
    });

    const completed = await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);
    const next = (completed.body as { next: Task }).next;

    await couple.blue.agent.post(`/api/tasks/${task.id}/reopen`).expect(200);

    const list = await listTasks(couple);
    expect(list.open.map((item) => item.id)).toContain(task.id);
    expect(list.open.map((item) => item.id)).not.toContain(next.id);

    const count = await getTestPool().query<{ total: number }>(
      `SELECT count(*)::int AS total FROM tasks WHERE generated_from_task_id = $1`,
      [task.id],
    );
    expect(count.rows[0]?.total).toBe(0);
  });

  it('Membro desfaz a conclusão depois de editar a próxima', async () => {
    const couple = await makeScenario(app).createCouple({});
    const today = todayInSaoPaulo(new Date());
    const task = await createTask(couple, {
      title: 'Semanal editada',
      dueOn: today,
      recurrence: { kind: 'weekly', interval: 1 },
    });

    const completed = await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);
    const next = (completed.body as { next: Task }).next;

    await couple.blue.agent
      .patch(`/api/tasks/${next.id}`)
      .send({ title: 'Próxima já tocada' })
      .expect(200);

    await couple.blue.agent.post(`/api/tasks/${task.id}/reopen`).expect(200);

    const list = await listTasks(couple);
    const reopened = list.open.find((item) => item.id === task.id);
    const kept = list.open.find((item) => item.id === next.id);

    expect(reopened?.completedAt).toBeNull();
    expect(kept?.title).toBe('Próxima já tocada');
  });

  it('Membro conclui uma tarefa já concluída', async () => {
    const couple = await makeScenario(app).createCouple({});
    const task = await createTask(couple, { title: 'Concluída duas vezes' });

    await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);

    const res = await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(409);
    expect((res.body as ErrorResponse).code).toBe('TASK_ALREADY_COMPLETED');
  });

  it('Membro exclui uma tarefa', async () => {
    const couple = await makeScenario(app).createCouple({});
    const task = await createTask(couple, { title: 'Tarefa descartável' });

    await couple.blue.agent.delete(`/api/tasks/${task.id}`).expect(204);

    const blueList = await listTasks(couple);
    expect(blueList.open.map((item) => item.id)).not.toContain(task.id);

    const purpleRes = await couple.purple.agent.get('/api/tasks').expect(200);
    expect((purpleRes.body as TasksResponse).open.map((item) => item.id)).not.toContain(task.id);
  });

  it('Tarefa concluída na semana passada', async () => {
    const couple = await makeScenario(app).createCouple({});
    const task = await createTask(couple, { title: 'Concluída há uma semana' });

    await couple.blue.agent.post(`/api/tasks/${task.id}/complete`).expect(200);
    await getTestPool().query(
      `UPDATE tasks SET completed_at = now() - interval '8 days' WHERE id = $1`,
      [task.id],
    );

    const list = await listTasks(couple);
    expect(list.completedThisWeek.map((item) => item.id)).not.toContain(task.id);
  });
});

/**
 * Primeiro mês de 31 dias seguido de um de 30 dias a partir de hoje. O dia 31
 * encolhe para o dia 30 e a ocorrência seguinte volta ao dia 31.
 */
function monthlyTransitionAfter(today: string): {
  anchor: string;
  due: string;
  expected: string;
} {
  const start = parseCalendarDate(today);

  for (let step = 0; step < 24; step += 1) {
    const monthIndex = start.year * 12 + (start.month - 1) + step;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;

    if (daysInMonth(year, month) !== 31) continue;

    const nextMonthIndex = monthIndex + 1;
    const nextYear = Math.floor(nextMonthIndex / 12);
    const nextMonth = (nextMonthIndex % 12) + 1;
    if (daysInMonth(nextYear, nextMonth) !== 30) continue;

    const anchor = formatCalendarDate({ year, month, day: 31 });
    const due = addRecurrence(anchor, 'monthly', 1, 1);
    if (due < today) continue;

    return { anchor, due, expected: addRecurrence(anchor, 'monthly', 1, 2) };
  }

  throw new Error('Nenhum mês de 31 dias seguido de 30 dias nos próximos 24 meses');
}
