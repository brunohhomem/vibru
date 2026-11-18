import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findCoupleById: vi.fn(),
  findCoupleMembers: vi.fn(),
  updateMemberIcsTokenHash: vi.fn(),
  listEventsBetween: vi.fn(),
  findActiveEvent: vi.fn(),
  insertEvent: vi.fn(),
  updateEvent: vi.fn(),
  softDeleteEvent: vi.fn(),
  listImportantDates: vi.fn(),
  findActiveImportantDate: vi.fn(),
  insertImportantDate: vi.fn(),
  updateImportantDate: vi.fn(),
  softDeleteImportantDate: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleById: mocks.findCoupleById,
  findCoupleMembers: mocks.findCoupleMembers,
  updateMemberIcsTokenHash: mocks.updateMemberIcsTokenHash,
}));
vi.mock('./agenda-repository', () => ({
  listEventsBetween: mocks.listEventsBetween,
  findActiveEvent: mocks.findActiveEvent,
  insertEvent: mocks.insertEvent,
  updateEvent: mocks.updateEvent,
  softDeleteEvent: mocks.softDeleteEvent,
}));
vi.mock('./important-dates-repository', () => ({
  listImportantDates: mocks.listImportantDates,
  findActiveImportantDate: mocks.findActiveImportantDate,
  insertImportantDate: mocks.insertImportantDate,
  updateImportantDate: mocks.updateImportantDate,
  softDeleteImportantDate: mocks.softDeleteImportantDate,
}));

import {
  createAgendaEventAction,
  getAgendaMonthAction,
  getIcsFeedStatusAction,
  regenerateIcsFeedAction,
  removeAgendaEventAction,
  removeImportantDateAction,
  revokeIcsFeedAction,
  updateAgendaEventAction,
} from './actions';
import { hashFeedToken } from './ics-feed-rules';

const MEMBER_ID = '0194c5e0-0000-7000-8000-0000000000a1';
const EVENT_ID = '0194c5e0-0000-7000-8000-0000000000e1';
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    title: 'Jantar',
    startsOn: '2026-06-10',
    startTime: null,
    notes: null,
    wishId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: MEMBER_ID, coupleId: 'couple-1' });
  mocks.findCoupleById.mockResolvedValue({
    id: 'couple-1',
    marriedOn: '2020-06-05',
    datingStartedOn: null,
  });
  mocks.listEventsBetween.mockResolvedValue([]);
  mocks.listImportantDates.mockResolvedValue([]);
});

describe('getAgendaMonthAction', () => {
  it('busca eventos, datas e casal sempre do casal do membro, no intervalo do mês', async () => {
    mocks.listEventsBetween.mockResolvedValue([eventRow()]);

    const result = await getAgendaMonthAction({ month: '2026-06' });

    expect(result).toMatchObject({
      ok: true,
      data: {
        month: '2026-06',
        events: [{ id: EVENT_ID, title: 'Jantar' }],
        anniversaries: [{ kind: 'wedding', years: 6 }],
      },
    });
    expect(mocks.findCoupleById).toHaveBeenCalledWith('couple-1');
    expect(mocks.listEventsBetween).toHaveBeenCalledWith('couple-1', '2026-06-01', '2026-06-30');
    expect(mocks.listImportantDates).toHaveBeenCalledWith('couple-1');
  });

  it('mês em formato inválido é recusado sem consultar o banco', async () => {
    expect(await getAgendaMonthAction({ month: '2026-13' })).toMatchObject({
      ok: false,
      code: 'invalid_input',
    });
    expect(mocks.listEventsBetween).not.toHaveBeenCalled();
  });
});

describe('eventos', () => {
  it('cria o evento sempre no casal do membro', async () => {
    mocks.insertEvent.mockImplementation(async (data: Record<string, unknown>) => eventRow(data));

    await createAgendaEventAction({ title: 'Jantar', startsOn: '2026-06-10' });

    expect(mocks.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ coupleId: 'couple-1' }),
    );
  });

  it('editar ou excluir evento de outro casal ou com id malformado dá "Item não encontrado"', async () => {
    mocks.findActiveEvent.mockResolvedValue(null);

    expect(await updateAgendaEventAction({ id: EVENT_ID, data: { title: 'Novo' } })).toMatchObject({
      ok: false,
      message: 'Item não encontrado',
    });
    expect(await removeAgendaEventAction({ id: EVENT_ID })).toMatchObject({
      ok: false,
      message: 'Item não encontrado',
    });
    expect(await removeAgendaEventAction({ id: 'nao-uuid' })).toMatchObject({
      ok: false,
      message: 'Item não encontrado',
    });
    expect(mocks.findActiveEvent).toHaveBeenCalledWith('couple-1', EVENT_ID);
    expect(mocks.updateEvent).not.toHaveBeenCalled();
    expect(mocks.softDeleteEvent).not.toHaveBeenCalled();
  });

  it('data importante de outro casal não é excluída', async () => {
    mocks.findActiveImportantDate.mockResolvedValue(null);

    expect(await removeImportantDateAction({ id: EVENT_ID })).toMatchObject({
      ok: false,
      message: 'Item não encontrado',
    });
    expect(mocks.softDeleteImportantDate).not.toHaveBeenCalled();
  });
});

describe('feed ICS', () => {
  it('regenerar grava só o hash do token e devolve o caminho com o token', async () => {
    const result = await regenerateIcsFeedAction(undefined);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const token = /^\/api\/ics\/([A-Za-z0-9_-]{43})\.ics$/.exec(result.data.feedPath)?.[1];
    expect(token).toBeDefined();
    expect(mocks.updateMemberIcsTokenHash).toHaveBeenCalledWith(
      'couple-1',
      MEMBER_ID,
      hashFeedToken(token ?? ''),
    );
    expect(JSON.stringify(mocks.updateMemberIcsTokenHash.mock.calls)).not.toContain(token);
  });

  it('desligar grava nulo', async () => {
    expect(await revokeIcsFeedAction(undefined)).toEqual({ ok: true, data: null });
    expect(mocks.updateMemberIcsTokenHash).toHaveBeenCalledWith('couple-1', MEMBER_ID, null);
  });

  it('o status diz se o feed do próprio membro está ligado', async () => {
    mocks.findCoupleMembers.mockResolvedValue([
      { id: MEMBER_ID, icsTokenHash: 'abc' },
      { id: 'other', icsTokenHash: null },
    ]);
    expect(await getIcsFeedStatusAction(undefined)).toEqual({ ok: true, data: { active: true } });

    mocks.findCoupleMembers.mockResolvedValue([{ id: MEMBER_ID, icsTokenHash: null }]);
    expect(await getIcsFeedStatusAction(undefined)).toEqual({ ok: true, data: { active: false } });
  });
});
