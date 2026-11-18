import { beforeEach, describe, expect, it, vi } from 'vitest';

type RepositoryMock = {
  listByMember: ReturnType<typeof vi.fn>;
  findActive: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  softDelete: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => {
  const repository = () => ({
    listByMember: vi.fn(),
    findActive: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  });
  return {
    readSessionUserId: vi.fn(),
    findMemberContextByUserId: vi.fn(),
    findCoupleMembers: vi.fn(),
    allergies: repository(),
    conditions: repository(),
    contacts: repository(),
    doctors: repository(),
    events: repository(),
    findHealthProfile: vi.fn(),
    upsertHealthProfile: vi.fn(),
    listMedicationsByMember: vi.fn(),
    countMedicationsByMember: vi.fn(),
  };
});

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleMembers: mocks.findCoupleMembers,
}));
vi.mock('./health-item-repositories', () => ({
  allergiesRepository: mocks.allergies,
  conditionsRepository: mocks.conditions,
  contactsRepository: mocks.contacts,
  doctorsRepository: mocks.doctors,
  eventsRepository: mocks.events,
}));
vi.mock('./health-profile-repository', () => ({
  findHealthProfile: mocks.findHealthProfile,
  upsertHealthProfile: mocks.upsertHealthProfile,
}));
vi.mock('./medications-repository', () => ({
  listMedicationsByMember: mocks.listMedicationsByMember,
  countMedicationsByMember: mocks.countMedicationsByMember,
}));

import {
  createAllergyAction,
  createEventAction,
  getHealthRecordAction,
  listHealthMembersAction,
  removeAllergyAction,
  saveHealthProfileAction,
  updateEventAction,
} from './actions';

const MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000a1';
const PARTNER_ID = '0194c5e0-0000-7000-8000-0000000000a2';
const OTHER_COUPLE_MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000ff';
const ITEM_ID = '0194c5e0-0000-7000-8000-000000000001';
const DOCTOR_ID = '0194c5e0-0000-7000-8000-0000000000d1';
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

function memberRow(id: string, displayName: string) {
  return { id, displayName, coupleId: 'couple-1', createdAt: CREATED_AT };
}

function allergyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    coupleId: 'couple-1',
    memberId: PARTNER_ID,
    substance: 'Dipirona',
    reaction: null,
    severity: 'severe',
    createdAt: CREATED_AT,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: MEMBER_ID, coupleId: 'couple-1' });
  mocks.findCoupleMembers.mockResolvedValue([
    memberRow(MEMBER_ID, 'Bruno'),
    memberRow(PARTNER_ID, 'Ana'),
  ]);
});

describe('acesso à ficha de outro membro', () => {
  it('membro de outro casal e id malformado respondem igual, sem tocar nos itens', async () => {
    const foreign = await createAllergyAction({
      memberId: OTHER_COUPLE_MEMBER_ID,
      data: { substance: 'Pólen', severity: 'mild' },
    });
    const malformed = await createAllergyAction({
      memberId: 'nao-uuid',
      data: { substance: 'Pólen', severity: 'mild' },
    });

    expect(foreign).toEqual(malformed);
    expect(foreign).toMatchObject({ ok: false, message: 'Pessoa não encontrada' });
    expect(mocks.findCoupleMembers).toHaveBeenCalledWith('couple-1');
    expect(mocks.allergies.insert).not.toHaveBeenCalled();
  });

  it('a ficha do parceiro do mesmo casal é acessível', async () => {
    mocks.allergies.insert.mockResolvedValue(allergyRow());

    const result = await createAllergyAction({
      memberId: PARTNER_ID,
      data: { substance: 'Dipirona', severity: 'severe' },
    });

    expect(result).toMatchObject({ ok: true, data: { id: ITEM_ID, substance: 'Dipirona' } });
    expect(mocks.allergies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ coupleId: 'couple-1', memberId: PARTNER_ID }),
    );
  });
});

describe('itens da ficha', () => {
  it('excluir item de outro membro dá "Item não encontrado" e não apaga nada', async () => {
    mocks.allergies.findActive.mockResolvedValue(null);

    const result = await removeAllergyAction({ memberId: MEMBER_ID, itemId: ITEM_ID });

    expect(result).toMatchObject({ ok: false, message: 'Item não encontrado' });
    expect(mocks.allergies.findActive).toHaveBeenCalledWith('couple-1', MEMBER_ID, ITEM_ID);
    expect(mocks.allergies.softDelete).not.toHaveBeenCalled();
  });

  it('id de item malformado dá "Item não encontrado" sem consultar o banco', async () => {
    const result = await removeAllergyAction({ memberId: MEMBER_ID, itemId: 'nao-uuid' });

    expect(result).toMatchObject({ ok: false, message: 'Item não encontrado' });
    expect(mocks.allergies.findActive).not.toHaveBeenCalled();
  });

  it('evento com médico de outro membro é recusado, na criação e na edição', async () => {
    mocks.doctors.findActive.mockResolvedValue(null);
    mocks.events.findActive.mockResolvedValue({ id: ITEM_ID });
    const data = {
      kind: 'exam',
      occurredOn: '2026-09-10',
      title: 'Hemograma',
      doctorId: DOCTOR_ID,
    };

    const created = await createEventAction({ memberId: MEMBER_ID, data });
    const updated = await updateEventAction({
      memberId: MEMBER_ID,
      itemId: ITEM_ID,
      data: { doctorId: DOCTOR_ID },
    });

    expect(created).toMatchObject({ ok: false, message: 'Item não encontrado' });
    expect(updated).toMatchObject({ ok: false, message: 'Item não encontrado' });
    expect(mocks.doctors.findActive).toHaveBeenCalledWith('couple-1', MEMBER_ID, DOCTOR_ID);
    expect(mocks.events.insert).not.toHaveBeenCalled();
    expect(mocks.events.update).not.toHaveBeenCalled();
  });

  it('erro de validação aponta o campo do formulário', async () => {
    const result = await createAllergyAction({
      memberId: MEMBER_ID,
      data: { substance: '', severity: 'mild' },
    });

    expect(result).toMatchObject({ ok: false, code: 'invalid_input', field: 'substance' });
  });
});

describe('saveHealthProfileAction', () => {
  it('substitui a ficha inteira: campo ausente vira nulo e texto vazio vira nulo', async () => {
    mocks.upsertHealthProfile.mockImplementation(async (row: Record<string, unknown>) => ({
      ...row,
    }));

    await saveHealthProfileAction({
      memberId: PARTNER_ID,
      data: { bloodType: 'O+', healthPlanName: '', notes: 'alérgico' },
    });

    expect(mocks.upsertHealthProfile).toHaveBeenCalledWith({
      coupleId: 'couple-1',
      memberId: PARTNER_ID,
      bloodType: 'O+',
      organDonor: null,
      healthPlanName: null,
      healthPlanNumber: null,
      preferredHospital: null,
      notes: 'alérgico',
    });
  });

  it('ficha de outro casal não é gravada', async () => {
    const result = await saveHealthProfileAction({
      memberId: OTHER_COUPLE_MEMBER_ID,
      data: { bloodType: 'A+' },
    });

    expect(result).toMatchObject({ ok: false, message: 'Pessoa não encontrada' });
    expect(mocks.upsertHealthProfile).not.toHaveBeenCalled();
  });
});

describe('getHealthRecordAction', () => {
  it('monta a ficha com tudo escopado ao casal e ao membro, e usa a ficha vazia sem perfil', async () => {
    for (const repository of [
      mocks.allergies,
      mocks.conditions,
      mocks.contacts,
      mocks.doctors,
      mocks.events,
    ] as RepositoryMock[]) {
      repository.listByMember.mockResolvedValue([]);
    }
    mocks.allergies.listByMember.mockResolvedValue([allergyRow()]);
    mocks.findHealthProfile.mockResolvedValue(null);
    mocks.listMedicationsByMember.mockResolvedValue([]);

    const result = await getHealthRecordAction({ memberId: PARTNER_ID });

    expect(result).toMatchObject({
      ok: true,
      data: {
        memberId: PARTNER_ID,
        memberName: 'Ana',
        profile: { bloodType: 'unknown' },
        allergies: [{ substance: 'Dipirona' }],
        medications: [],
      },
    });
    expect(mocks.findHealthProfile).toHaveBeenCalledWith('couple-1', PARTNER_ID);
    expect(mocks.listMedicationsByMember).toHaveBeenCalledWith('couple-1', PARTNER_ID);
    expect(mocks.events.listByMember).toHaveBeenCalledWith('couple-1', PARTNER_ID);
  });

  it('ficha de outro casal não é montada', async () => {
    expect(await getHealthRecordAction({ memberId: OTHER_COUPLE_MEMBER_ID })).toMatchObject({
      ok: false,
      message: 'Pessoa não encontrada',
    });
    expect(mocks.findHealthProfile).not.toHaveBeenCalled();
  });
});

describe('listHealthMembersAction', () => {
  it('lista os membros do casal com a contagem de remédios (zero quando não há)', async () => {
    mocks.countMedicationsByMember.mockResolvedValue([
      { memberId: PARTNER_ID, medicationCount: 3 },
    ]);

    expect(await listHealthMembersAction(undefined)).toEqual({
      ok: true,
      data: {
        members: [
          { memberId: MEMBER_ID, name: 'Bruno', medicationCount: 0 },
          { memberId: PARTNER_ID, name: 'Ana', medicationCount: 3 },
        ],
      },
    });
    expect(mocks.countMedicationsByMember).toHaveBeenCalledWith('couple-1');
  });
});
