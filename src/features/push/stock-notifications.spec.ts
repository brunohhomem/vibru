import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findActiveMedication: vi.fn(),
  sendPushToMember: vi.fn(),
}));

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));
vi.mock('@/features/health/medications-repository', () => ({
  findActiveMedication: mocks.findActiveMedication,
}));
vi.mock('./push-sender', () => ({ sendPushToMember: mocks.sendPushToMember }));

import { notifyLowStock } from './stock-notifications';

const WARNING = { medicationId: 'med-1', name: 'Losartana', daysLeft: 3 };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('notifyLowStock', () => {
  it('avisa o dono do remédio no tipo estoque baixo', async () => {
    mocks.findActiveMedication.mockResolvedValue({ id: 'med-1', memberId: 'member-owner' });

    await notifyLowStock({ coupleId: 'couple-1', warning: WARNING });

    expect(mocks.findActiveMedication).toHaveBeenCalledWith('couple-1', 'med-1');
    expect(mocks.sendPushToMember).toHaveBeenCalledWith(
      'couple-1',
      'member-owner',
      expect.objectContaining({ body: 'Losartana: sobra para 3 dias' }),
      'lowStock',
    );
  });

  it('remédio apagado ou de outro casal não gera aviso', async () => {
    mocks.findActiveMedication.mockResolvedValue(null);

    await notifyLowStock({ coupleId: 'couple-1', warning: WARNING });

    expect(mocks.sendPushToMember).not.toHaveBeenCalled();
  });
});
