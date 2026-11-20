import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listSubscribedMembers: vi.fn(),
  sendPushToSubscription: vi.fn(),
  listOpenTasks: vi.fn(),
  listEventsBetween: vi.fn(),
  listImportantDates: vi.fn(),
}));

vi.mock('./push-repository', () => ({ listSubscribedMembers: mocks.listSubscribedMembers }));
vi.mock('./push-sender', () => ({ sendPushToSubscription: mocks.sendPushToSubscription }));
vi.mock('@/features/tasks/tasks-repository', () => ({ listOpenTasks: mocks.listOpenTasks }));
vi.mock('@/features/agenda/agenda-repository', () => ({
  listEventsBetween: mocks.listEventsBetween,
}));
vi.mock('@/features/agenda/important-dates-repository', () => ({
  listImportantDates: mocks.listImportantDates,
}));

import { sendDailySummaries } from './daily-summary';

// 12:00 UTC de 20/11/2026 é 09:00 em São Paulo: hoje é 2026-11-20, amanhã 2026-11-21.
const NOW = new Date('2026-11-20T12:00:00.000Z');
const ALL_ON = {
  taskAssigned: true,
  taskCompleted: true,
  dailySummary: true,
  tomorrowPreview: true,
  lowStock: false,
};

function subscriber(preferences = ALL_ON) {
  return {
    coupleId: 'couple-1',
    memberId: 'member-1',
    endpoint: 'https://push.test/1',
    p256dh: 'p',
    auth: 'a',
    preferences,
  };
}

function eventOn(startsOn: string, title: string) {
  return { startsOn, title };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sendPushToSubscription.mockResolvedValue('sent');
  mocks.listOpenTasks.mockResolvedValue([]);
  mocks.listImportantDates.mockResolvedValue([]);
  mocks.listEventsBetween.mockResolvedValue([
    eventOn('2026-11-20', 'Dentista'),
    eventOn('2026-11-21', 'Jantar'),
  ]);
  mocks.listSubscribedMembers.mockResolvedValue([subscriber()]);
});

describe('sendDailySummaries', () => {
  it('manda os eventos de hoje e a prévia dos de amanhã, buscando os dois dias de uma vez', async () => {
    const result = await sendDailySummaries(NOW);

    expect(mocks.listEventsBetween).toHaveBeenCalledWith('couple-1', '2026-11-20', '2026-11-21');
    expect(mocks.sendPushToSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.test/1' }),
      expect.objectContaining({
        title: 'Hoje no Vibru',
        body: 'Eventos: Dentista\nAmanhã: Jantar',
      }),
    );
    expect(result).toEqual({ couples: 1, notificationsSent: 1 });
  });

  it('com a prévia de amanhã desligada manda só o de hoje', async () => {
    mocks.listSubscribedMembers.mockResolvedValue([
      subscriber({ ...ALL_ON, tomorrowPreview: false }),
    ]);

    await sendDailySummaries(NOW);

    expect(mocks.sendPushToSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: 'Eventos: Dentista' }),
    );
  });

  it('com o resumo desligado não manda nada, nem a prévia', async () => {
    mocks.listSubscribedMembers.mockResolvedValue([subscriber({ ...ALL_ON, dailySummary: false })]);

    const result = await sendDailySummaries(NOW);

    expect(mocks.sendPushToSubscription).not.toHaveBeenCalled();
    expect(result.notificationsSent).toBe(0);
  });

  it('um casal que falha não impede o resumo do outro', async () => {
    mocks.listSubscribedMembers.mockResolvedValue([
      subscriber(),
      { ...subscriber(), coupleId: 'couple-2', endpoint: 'https://push.test/2' },
    ]);
    mocks.listEventsBetween.mockRejectedValueOnce(new Error('banco fora')).mockResolvedValue([]);
    mocks.listOpenTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { title: 'Pagar luz', dueOn: '2026-11-20', assigneeMemberId: null, medicationId: null },
      ]);

    const result = await sendDailySummaries(NOW);

    expect(result.couples).toBe(2);
    expect(mocks.sendPushToSubscription).toHaveBeenCalledTimes(1);
  });
});
