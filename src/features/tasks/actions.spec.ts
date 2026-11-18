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
    expect(mocks.completeTaskIfOpen).not.toHaveBeenCalled();
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
    expect(mocks.insertTask).not.toHaveBeenCalled();
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
