import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCoupleMembers: vi.fn(),
  sendPushToMember: vi.fn(),
}));

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleMembers: mocks.findCoupleMembers,
}));
vi.mock('./push-sender', () => ({ sendPushToMember: mocks.sendPushToMember }));

import { notifyTaskAssigned, notifyTaskCompleted } from './task-notifications';

const ME = 'member-me';
const PARTNER = 'member-partner';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findCoupleMembers.mockResolvedValue([
    { id: ME, displayName: 'Bruno' },
    { id: PARTNER, displayName: 'Ela' },
  ]);
});

describe('notifyTaskAssigned', () => {
  it('avisa o responsável dizendo quem atribuiu', async () => {
    await notifyTaskAssigned({
      coupleId: 'couple-1',
      actorMemberId: ME,
      assigneeMemberId: PARTNER,
      taskTitle: 'Lavar a louça',
    });

    expect(mocks.sendPushToMember).toHaveBeenCalledWith(
      'couple-1',
      PARTNER,
      expect.objectContaining({ body: 'Bruno: Lavar a louça' }),
    );
  });

  it('não avisa quando a pessoa atribui a si mesma', async () => {
    await notifyTaskAssigned({
      coupleId: 'couple-1',
      actorMemberId: ME,
      assigneeMemberId: ME,
      taskTitle: 'x',
    });

    expect(mocks.sendPushToMember).not.toHaveBeenCalled();
  });

  it.each([null, undefined])('não avisa quando não há responsável (%s)', async (assignee) => {
    await notifyTaskAssigned({
      coupleId: 'couple-1',
      actorMemberId: ME,
      assigneeMemberId: assignee,
      taskTitle: 'x',
    });

    expect(mocks.sendPushToMember).not.toHaveBeenCalled();
    expect(mocks.findCoupleMembers).not.toHaveBeenCalled();
  });
});

describe('notifyTaskCompleted', () => {
  it('avisa só o outro membro, nunca quem concluiu', async () => {
    await notifyTaskCompleted({
      coupleId: 'couple-1',
      actorMemberId: ME,
      taskTitle: 'Comprar pão',
      isMedicationTask: false,
    });

    expect(mocks.sendPushToMember).toHaveBeenCalledTimes(1);
    expect(mocks.sendPushToMember).toHaveBeenCalledWith(
      'couple-1',
      PARTNER,
      expect.objectContaining({ title: 'Bruno concluiu uma tarefa' }),
    );
  });

  it('não avisa de tarefa de remédio, por ser dado de saúde', async () => {
    await notifyTaskCompleted({
      coupleId: 'couple-1',
      actorMemberId: ME,
      taskTitle: 'Losartana',
      isMedicationTask: true,
    });

    expect(mocks.sendPushToMember).not.toHaveBeenCalled();
    expect(mocks.findCoupleMembers).not.toHaveBeenCalled();
  });
});
