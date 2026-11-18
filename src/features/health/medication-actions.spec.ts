import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findCoupleMembers: vi.fn(),
  findActiveMedication: vi.fn(),
  insertMedication: vi.fn(),
  updateMedication: vi.fn(),
  softDeleteMedication: vi.fn(),
  listOpenTasksByMedication: vi.fn(),
  softDeleteTasks: vi.fn(),
  insertTask: vi.fn(),
  updateTask: vi.fn(),
  addItemToNamedList: vi.fn(),
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
    transaction: (callback: (transaction: unknown) => unknown) => callback({ tx: true }),
  }),
}));
vi.mock('./medications-repository', () => ({
  findActiveMedication: mocks.findActiveMedication,
  insertMedication: mocks.insertMedication,
  updateMedication: mocks.updateMedication,
  softDeleteMedication: mocks.softDeleteMedication,
}));
vi.mock('@/features/tasks/tasks-repository', () => ({
  listOpenTasksByMedication: mocks.listOpenTasksByMedication,
  softDeleteTasks: mocks.softDeleteTasks,
  insertTask: mocks.insertTask,
  updateTask: mocks.updateTask,
}));
vi.mock('@/features/lists/named-list', () => ({ addItemToNamedList: mocks.addItemToNamedList }));

import {
  addMedicationToPharmacyAction,
  createMedicationAction,
  removeMedicationAction,
  updateMedicationAction,
} from './medication-actions';

const MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000a1';
const OTHER_MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000ff';
const MEDICATION_ID = '0194c5e0-0000-7000-8000-0000000000b1';
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

function medicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MEDICATION_ID,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    memberId: MEMBER_ID,
    name: 'Dipirona',
    dosage: '500mg',
    instructions: '',
    times: ['08:00', '20:00'],
    isContinuous: true,
    stockUnits: 10,
    unitsPerDose: 1,
    lowStockDays: 7,
    lowStockPromptedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: MEMBER_ID, coupleId: 'couple-1' });
  mocks.findCoupleMembers.mockResolvedValue([{ id: MEMBER_ID, displayName: 'Bruno' }]);
  mocks.listOpenTasksByMedication.mockResolvedValue([]);
});

describe('createMedicationAction', () => {
  it('grava o remédio com horários ordenados e cria uma tarefa diária por horário', async () => {
    mocks.insertMedication.mockImplementation(async (data: Record<string, unknown>) =>
      medicationRow(data),
    );

    const result = await createMedicationAction({
      memberId: MEMBER_ID,
      data: { name: 'Dipirona', dosage: '500mg', times: ['20:00', '08:00'] },
    });

    expect(result).toMatchObject({ ok: true, data: { times: ['08:00', '20:00'] } });
    expect(mocks.insertMedication).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        memberId: MEMBER_ID,
        times: ['08:00', '20:00'],
      }),
      { tx: true },
    );
    expect(mocks.insertTask).toHaveBeenCalledTimes(2);
    expect(mocks.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        title: 'Tomar Dipirona 500mg',
        assigneeMemberId: MEMBER_ID,
        dueTime: '08:00',
        category: 'health',
        medicationId: MEDICATION_ID,
        recurrenceKind: 'daily',
      }),
      { tx: true },
    );
  });

  it('remédio para membro de outro casal não é criado', async () => {
    const result = await createMedicationAction({
      memberId: OTHER_MEMBER_ID,
      data: { name: 'Dipirona' },
    });

    expect(result).toMatchObject({ ok: false, message: 'Pessoa não encontrada' });
    expect(mocks.insertMedication).not.toHaveBeenCalled();
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });
});

describe('updateMedicationAction', () => {
  it('repor o estoque libera o próximo aviso e a edição roda na transação', async () => {
    mocks.findActiveMedication.mockResolvedValue(medicationRow({ stockUnits: 2 }));
    mocks.updateMedication.mockResolvedValue(medicationRow({ stockUnits: 30 }));

    await updateMedicationAction({ id: MEDICATION_ID, data: { stockUnits: 30 } });

    expect(mocks.findActiveMedication).toHaveBeenCalledWith('couple-1', MEDICATION_ID);
    expect(mocks.updateMedication).toHaveBeenCalledWith(
      'couple-1',
      MEDICATION_ID,
      expect.objectContaining({ stockUnits: 30, lowStockPromptedAt: null }),
      { tx: true },
    );
  });

  it('as tarefas abertas ganham o título novo e as de horário removido saem', async () => {
    mocks.findActiveMedication.mockResolvedValue(medicationRow());
    mocks.updateMedication.mockResolvedValue(
      medicationRow({ name: 'Novalgina', times: ['08:00'] }),
    );
    mocks.listOpenTasksByMedication.mockResolvedValue([
      { id: 't8', dueTime: '08:00:00', title: 'Tomar Dipirona 500mg', assigneeMemberId: MEMBER_ID },
      {
        id: 't20',
        dueTime: '20:00:00',
        title: 'Tomar Dipirona 500mg',
        assigneeMemberId: MEMBER_ID,
      },
    ]);

    await updateMedicationAction({
      id: MEDICATION_ID,
      data: { name: 'Novalgina', times: ['08:00'] },
    });

    expect(mocks.updateTask).toHaveBeenCalledWith(
      'couple-1',
      't8',
      { title: 'Tomar Novalgina 500mg', assigneeMemberId: MEMBER_ID },
      { tx: true },
    );
    expect(mocks.softDeleteTasks).toHaveBeenCalledWith('couple-1', ['t20'], { tx: true });
    expect(mocks.insertTask).not.toHaveBeenCalled();
  });

  it('remédio de outro casal ou id malformado vira "Remédio não encontrado"', async () => {
    mocks.findActiveMedication.mockResolvedValue(null);

    expect(await updateMedicationAction({ id: MEDICATION_ID, data: { name: 'x' } })).toMatchObject({
      ok: false,
      message: 'Remédio não encontrado',
    });
    expect(await updateMedicationAction({ id: 'nao-uuid', data: { name: 'x' } })).toMatchObject({
      ok: false,
      message: 'Remédio não encontrado',
    });
    expect(mocks.updateMedication).not.toHaveBeenCalled();
  });
});

describe('removeMedicationAction', () => {
  it('desativa o remédio e remove só as tarefas abertas dele, na mesma transação', async () => {
    mocks.findActiveMedication.mockResolvedValue(medicationRow());
    mocks.softDeleteMedication.mockResolvedValue(true);
    mocks.listOpenTasksByMedication.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

    expect(await removeMedicationAction({ id: MEDICATION_ID })).toEqual({ ok: true, data: null });

    expect(mocks.softDeleteMedication).toHaveBeenCalledWith('couple-1', MEDICATION_ID, {
      tx: true,
    });
    expect(mocks.listOpenTasksByMedication).toHaveBeenCalledWith('couple-1', MEDICATION_ID, {
      tx: true,
    });
    expect(mocks.softDeleteTasks).toHaveBeenCalledWith('couple-1', ['t1', 't2'], { tx: true });
  });
});

describe('addMedicationToPharmacyAction', () => {
  it('manda o nome do remédio para a lista Farmácia do casal', async () => {
    mocks.findActiveMedication.mockResolvedValue(medicationRow());
    mocks.addItemToNamedList.mockResolvedValue({
      list: { id: 'l1', title: 'Farmácia' },
      item: { id: 'i1', title: 'Dipirona' },
      alreadyListed: false,
    });

    const result = await addMedicationToPharmacyAction({ id: MEDICATION_ID });

    expect(result).toMatchObject({ ok: true, data: { alreadyListed: false } });
    expect(mocks.addItemToNamedList).toHaveBeenCalledWith('couple-1', 'Farmácia', 'Dipirona');
  });

  it('remédio de outro casal não vai para a lista', async () => {
    mocks.findActiveMedication.mockResolvedValue(null);

    expect(await addMedicationToPharmacyAction({ id: MEDICATION_ID })).toMatchObject({
      ok: false,
      message: 'Remédio não encontrado',
    });
    expect(mocks.addItemToNamedList).not.toHaveBeenCalled();
  });
});
