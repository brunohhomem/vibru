import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  upsertPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('./push-repository', () => ({
  upsertPushSubscription: mocks.upsertPushSubscription,
  deletePushSubscription: mocks.deletePushSubscription,
}));

import { subscribePushAction, unsubscribePushAction } from './actions';

const VALID_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u',
    auth: 'tBHItJI5svbpez7KI4CCXg',
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({
    memberId: 'member-a',
    coupleId: 'couple-1',
    color: 'blue',
  });
});

describe('subscribePushAction', () => {
  it('grava a inscrição para o usuário da sessão', async () => {
    expect(await subscribePushAction(VALID_SUBSCRIPTION)).toMatchObject({ ok: true });
    expect(mocks.upsertPushSubscription).toHaveBeenCalledWith('user-a', VALID_SUBSCRIPTION);
  });

  it('recusa endpoint que não é https e não grava', async () => {
    const result = await subscribePushAction({
      ...VALID_SUBSCRIPTION,
      endpoint: 'http://10.0.0.1/push',
    });

    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled();
  });

  it('recusa chaves com caracteres fora do base64url', async () => {
    const result = await subscribePushAction({
      ...VALID_SUBSCRIPTION,
      keys: { p256dh: 'com espaço', auth: 'ok' },
    });

    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled();
  });

  it('sem sessão recusa antes de qualquer acesso ao banco', async () => {
    mocks.readSessionUserId.mockResolvedValue(null);

    expect(await subscribePushAction(VALID_SUBSCRIPTION)).toMatchObject({
      ok: false,
      code: 'unauthenticated',
    });
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled();
  });
});

describe('unsubscribePushAction', () => {
  it('remove só a inscrição do usuário da sessão', async () => {
    await unsubscribePushAction({ endpoint: VALID_SUBSCRIPTION.endpoint });

    expect(mocks.deletePushSubscription).toHaveBeenCalledWith(
      'user-a',
      VALID_SUBSCRIPTION.endpoint,
    );
  });
});
