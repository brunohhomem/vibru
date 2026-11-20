import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findCoupleMembers: vi.fn(),
  findActiveTaskById: vi.fn(),
  completeTaskIfOpen: vi.fn(),
  insertTask: vi.fn(),
  updateTask: vi.fn(),
  softDeleteTask: vi.fn(),
  clearTaskCompletion: vi.fn(),
  findOpenGeneratedChild: vi.fn(),
  hardDeleteTask: vi.fn(),
  consumeDose: vi.fn(),
  returnDose: vi.fn(),
  queueTaskAssignedPush: vi.fn(),
  queueTaskCompletedPush: vi.fn(),
}));

vi.mock('@/features/push/task-notifications', () => ({
  queueTaskAssignedPush: mocks.queueTaskAssignedPush,
  queueTaskCompletedPush: mocks.queueTaskCompletedPush,
}));

vi.mock('@/features/health/medication-stock-operations', () => ({
  consumeDose: mocks.consumeDose,
  returnDose: mocks.returnDose,
}));
vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleMembers: mocks.findCoupleMembers,
}));
vi.mock('@/db/client', () => ({
  getDatabase: () => ({
    transaction: (callback: (transaction: unknown) => unknown) => callback({}),
  }),
}));
vi.mock('./tasks-repository', () => ({
  findActiveTaskById: mocks.findActiveTaskById,
  completeTaskIfOpen: mocks.completeTaskIfOpen,
  insertTask: mocks.insertTask,
  updateTask: mocks.updateTask,
  softDeleteTask: mocks.softDeleteTask,
  clearTaskCompletion: mocks.clearTaskCompletion,
  findOpenGeneratedChild: mocks.findOpenGeneratedChild,
  hardDeleteTask: mocks.hardDeleteTask,
  listOpenTasks: vi.fn(),
  listTasksCompletedBetween: vi.fn(),
}));

import {
  completeTaskAction,
  createTaskAction,
  removeTaskAction,
  reopenTaskAction,
  updateTaskAction,
} from './actions';

const TASK_ID = '0194c5e0-0000-7000-8000-000000000001';
const MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000a1';
const PARTNER_ID = '0194c5e0-0000-7000-8000-0000000000a2';

function openTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    coupleId: 'couple-1',
    title: 'Lavar o carro',
    notes: null,
    assigneeMemberId: null,
    dueOn: '2026-10-10',
    dueTime: null,
    category: 'home',
    medicationId: null,
    recurrenceKind: 'none',
    recurrenceInterval: 1,
    recurrenceAnchorOn: null,
    completedAt: null,
    completedByMemberId: null,
    generatedFromTaskId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: MEMBER_ID, coupleId: 'couple-1' });
  mocks.findCoupleMembers.mockResolvedValue([{ id: MEMBER_ID }, { id: PARTNER_ID }]);
  mocks.findActiveTaskById.mockResolvedValue(openTask());
});

describe('completeTaskAction', () => {
  it('a segunda conclusão falha e não cria outra ocorrência', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(null);

    expect(await completeTaskAction({ id: TASK_ID })).toMatchObject({
      ok: false,
      message: 'Tarefa já concluída',
    });
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });

  it('tarefa que não repete não gera a próxima', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(openTask({ completedAt: new Date() }));

    const result = await completeTaskAction({ id: TASK_ID });

    expect(result).toMatchObject({ ok: true, data: { next: null, lowStock: null } });
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });

  it('tarefa recorrente gera a próxima na mesma transação', async () => {
    const completed = openTask({
      recurrenceKind: 'daily',
      recurrenceAnchorOn: '2999-01-01',
      dueOn: '2999-01-01',
      completedAt: new Date(),
    });
    mocks.completeTaskIfOpen.mockResolvedValue(completed);
    mocks.insertTask.mockImplementation(async (data: Record<string, unknown>) =>
      openTask({ ...data, id: 'next-task' }),
    );

    const result = await completeTaskAction({ id: TASK_ID });

    expect(result).toMatchObject({
      ok: true,
      data: { next: { id: 'next-task', dueOn: '2999-01-02' } },
    });
    expect(mocks.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ generatedFromTaskId: TASK_ID, recurrenceAnchorOn: '2999-01-01' }),
      expect.anything(),
    );
  });

  it('id que não é UUID ou de outro casal vira não encontrada, sem tocar no banco', async () => {
    expect(await completeTaskAction({ id: 'não-é-uuid' })).toMatchObject({
      ok: false,
      message: 'Tarefa não encontrada',
    });

    mocks.findActiveTaskById.mockResolvedValue(null);
    expect(await completeTaskAction({ id: TASK_ID })).toMatchObject({
      ok: false,
      message: 'Tarefa não encontrada',
    });
    expect(mocks.findActiveTaskById).toHaveBeenCalledWith('couple-1', TASK_ID);
    expect(mocks.completeTaskIfOpen).not.toHaveBeenCalled();
  });
});

describe('estoque de remédio ao concluir', () => {
  it('concluir tarefa de remédio desconta a dose na mesma transação e devolve o aviso', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(
      openTask({ medicationId: 'med-1', completedAt: new Date() }),
    );
    mocks.consumeDose.mockResolvedValue({ medicationId: 'med-1', name: 'Dipirona', daysLeft: 3 });

    const result = await completeTaskAction({ id: TASK_ID });

    expect(mocks.consumeDose).toHaveBeenCalledWith('couple-1', 'med-1', expect.anything());
    expect(result).toMatchObject({
      ok: true,
      data: { lowStock: { medicationId: 'med-1', name: 'Dipirona', daysLeft: 3 } },
    });
  });

  it('concluir tarefa comum não toca no estoque', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(openTask({ completedAt: new Date() }));

    await completeTaskAction({ id: TASK_ID });

    expect(mocks.consumeDose).not.toHaveBeenCalled();
  });

  it('concluir pela segunda vez não desconta de novo', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(null);

    await completeTaskAction({ id: TASK_ID });

    expect(mocks.consumeDose).not.toHaveBeenCalled();
  });

  it('reabrir tarefa de remédio devolve a dose; reabrir tarefa comum não', async () => {
    mocks.findActiveTaskById.mockResolvedValue(
      openTask({ medicationId: 'med-1', completedAt: new Date() }),
    );
    mocks.clearTaskCompletion.mockResolvedValue(openTask({ medicationId: 'med-1' }));
    await reopenTaskAction({ id: TASK_ID });
    expect(mocks.returnDose).toHaveBeenCalledWith('couple-1', 'med-1', expect.anything());

    mocks.returnDose.mockReset();
    mocks.findActiveTaskById.mockResolvedValue(openTask({ completedAt: new Date() }));
    mocks.clearTaskCompletion.mockResolvedValue(openTask());
    await reopenTaskAction({ id: TASK_ID });
    expect(mocks.returnDose).not.toHaveBeenCalled();
  });
});

describe('reabrir duas vezes ao mesmo tempo', () => {
  it('a segunda reabertura (a tarefa já voltou a abrir) falha sem devolver a dose nem apagar o filho', async () => {
    mocks.findActiveTaskById.mockResolvedValue(
      openTask({ medicationId: 'med-1', completedAt: new Date() }),
    );
    mocks.clearTaskCompletion.mockResolvedValue(null);

    const result = await reopenTaskAction({ id: TASK_ID });

    expect(result).toMatchObject({ ok: false, message: 'Tarefa não está concluída' });
    expect(mocks.returnDose).not.toHaveBeenCalled();
    expect(mocks.findOpenGeneratedChild).not.toHaveBeenCalled();
    expect(mocks.hardDeleteTask).not.toHaveBeenCalled();
  });
});

describe('reopenTaskAction', () => {
  it('recusa reabrir tarefa que não está concluída', async () => {
    expect(await reopenTaskAction({ id: TASK_ID })).toMatchObject({
      ok: false,
      message: 'Tarefa não está concluída',
    });
  });

  it('apaga o filho gerado só se ninguém mexeu nele', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ completedAt: new Date() }));
    mocks.clearTaskCompletion.mockResolvedValue(openTask());
    mocks.findOpenGeneratedChild.mockResolvedValue(openTask({ id: 'child' }));
    await reopenTaskAction({ id: TASK_ID });
    expect(mocks.hardDeleteTask).toHaveBeenCalledWith('couple-1', 'child', expect.anything());

    mocks.hardDeleteTask.mockReset();
    mocks.findOpenGeneratedChild.mockResolvedValue(
      openTask({ id: 'child', updatedAt: new Date('2026-10-02T10:00:00.000Z') }),
    );
    await reopenTaskAction({ id: TASK_ID });
    expect(mocks.hardDeleteTask).not.toHaveBeenCalled();
  });
});

describe('createTaskAction', () => {
  it('recusa responsável que não é do casal, no campo do responsável', async () => {
    const result = await createTaskAction({
      title: 'Comprar pão',
      assigneeMemberId: '0194c5e0-0000-7000-8000-0000000000ff',
    });

    expect(result).toMatchObject({ ok: false, field: 'assigneeMemberId' });
    expect(mocks.findCoupleMembers).toHaveBeenCalledWith('couple-1');
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });

  it('recorrência sem prazo volta com o campo do prazo e a mensagem em português', async () => {
    const result = await createTaskAction({
      title: 'Regar as plantas',
      assigneeMemberId: null,
      recurrence: { kind: 'daily', interval: 1 },
    });

    expect(result).toEqual({
      ok: false,
      code: 'invalid_input',
      message: 'Tarefa recorrente precisa de prazo',
      field: 'dueOn',
    });
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });

  it('grava a tarefa sempre no casal do membro', async () => {
    mocks.insertTask.mockImplementation(async (data: Record<string, unknown>) => openTask(data));

    await createTaskAction({ title: 'Comprar pão', assigneeMemberId: MEMBER_ID });

    expect(mocks.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ coupleId: 'couple-1' }),
    );
  });

  it('recusa horário sem prazo, no campo do horário', async () => {
    const result = await createTaskAction({
      title: 'Comprar pão',
      assigneeMemberId: null,
      dueTime: '09:00',
    });

    expect(result).toMatchObject({ ok: false, field: 'dueTime' });
  });
});

describe('updateTaskAction', () => {
  it('tarefa de remédio recusa campos travados e aceita observações', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ medicationId: 'med-1' }));
    mocks.updateTask.mockResolvedValue(openTask({ medicationId: 'med-1', notes: 'com água' }));

    expect(await updateTaskAction({ id: TASK_ID, patch: { title: 'outro' } })).toMatchObject({
      ok: false,
      message: 'Tarefa de remédio só muda pelo remédio',
    });
    expect(await updateTaskAction({ id: TASK_ID, patch: { notes: 'com água' } })).toMatchObject({
      ok: true,
    });
  });

  it('recusa responsável de outro casal na edição, conferindo o casal do membro', async () => {
    const result = await updateTaskAction({
      id: TASK_ID,
      patch: { assigneeMemberId: '0194c5e0-0000-7000-8000-0000000000ff' },
    });

    expect(result).toMatchObject({ ok: false, field: 'assigneeMemberId' });
    expect(mocks.findCoupleMembers).toHaveBeenCalledWith('couple-1');
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('responsável nulo na edição é aceito e gravado como "nós"', async () => {
    mocks.updateTask.mockResolvedValue(openTask());

    await updateTaskAction({ id: TASK_ID, patch: { assigneeMemberId: null } });

    expect(mocks.findCoupleMembers).not.toHaveBeenCalled();
    expect(mocks.updateTask).toHaveBeenCalledWith(
      'couple-1',
      TASK_ID,
      expect.objectContaining({ assigneeMemberId: null }),
    );
  });

  it('limpar o prazo de uma tarefa recorrente é recusado, no campo do prazo', async () => {
    mocks.findActiveTaskById.mockResolvedValue(
      openTask({ recurrenceKind: 'weekly', recurrenceAnchorOn: '2026-10-10' }),
    );

    const result = await updateTaskAction({ id: TASK_ID, patch: { dueOn: null } });

    expect(result).toMatchObject({ ok: false, field: 'dueOn' });
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('horário em tarefa sem prazo é recusado, no campo do horário', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ dueOn: null }));

    const result = await updateTaskAction({ id: TASK_ID, patch: { dueTime: '09:00' } });

    expect(result).toMatchObject({ ok: false, field: 'dueTime' });
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('limpar o prazo de uma tarefa com horário limpa o horário junto', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ dueTime: '09:00:00' }));
    mocks.updateTask.mockResolvedValue(openTask({ dueOn: null }));

    await updateTaskAction({ id: TASK_ID, patch: { dueOn: null } });

    expect(mocks.updateTask).toHaveBeenCalledWith(
      'couple-1',
      TASK_ID,
      expect.objectContaining({ dueTime: null, dueOn: null }),
    );
  });
});

describe('removeTaskAction', () => {
  it('tarefa de remédio não se exclui por aqui', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ medicationId: 'med-1' }));

    expect(await removeTaskAction({ id: TASK_ID })).toMatchObject({ ok: false });
    expect(mocks.softDeleteTask).not.toHaveBeenCalled();
  });
});

describe('avisos de push das tarefas', () => {
  it('criar tarefa para o parceiro enfileira o aviso de atribuição', async () => {
    mocks.insertTask.mockImplementation(async (data: Record<string, unknown>) => openTask(data));

    await createTaskAction({ title: 'Comprar pão', assigneeMemberId: PARTNER_ID });

    expect(mocks.queueTaskAssignedPush).toHaveBeenCalledWith({
      coupleId: 'couple-1',
      actorMemberId: MEMBER_ID,
      assigneeMemberId: PARTNER_ID,
      taskTitle: 'Comprar pão',
    });
  });

  it('editar sem trocar o responsável não reenvia o aviso', async () => {
    mocks.updateTask.mockResolvedValue(openTask({ title: 'Novo título' }));

    await updateTaskAction({ id: TASK_ID, patch: { title: 'Novo título' } });

    expect(mocks.queueTaskAssignedPush).not.toHaveBeenCalled();
  });

  it('trocar o responsável para o parceiro avisa com o título atualizado', async () => {
    mocks.updateTask.mockResolvedValue(openTask({ assigneeMemberId: PARTNER_ID }));

    await updateTaskAction({ id: TASK_ID, patch: { assigneeMemberId: PARTNER_ID } });

    expect(mocks.queueTaskAssignedPush).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeMemberId: PARTNER_ID, taskTitle: 'Lavar o carro' }),
    );
  });

  it('concluir tarefa comum enfileira o aviso de conclusão', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(openTask({ completedAt: new Date() }));

    await completeTaskAction({ id: TASK_ID });

    expect(mocks.queueTaskCompletedPush).toHaveBeenCalledWith({
      coupleId: 'couple-1',
      actorMemberId: MEMBER_ID,
      taskTitle: 'Lavar o carro',
      isMedicationTask: false,
    });
  });

  it('concluir tarefa de remédio marca o aviso como de saúde', async () => {
    mocks.findActiveTaskById.mockResolvedValue(openTask({ medicationId: 'med-1' }));
    mocks.completeTaskIfOpen.mockResolvedValue(
      openTask({ medicationId: 'med-1', completedAt: new Date() }),
    );

    await completeTaskAction({ id: TASK_ID });

    expect(mocks.queueTaskCompletedPush).toHaveBeenCalledWith(
      expect.objectContaining({ isMedicationTask: true }),
    );
  });

  it('tarefa já concluída falha e não avisa ninguém', async () => {
    mocks.completeTaskIfOpen.mockResolvedValue(null);

    await completeTaskAction({ id: TASK_ID });

    expect(mocks.queueTaskCompletedPush).not.toHaveBeenCalled();
  });
});
