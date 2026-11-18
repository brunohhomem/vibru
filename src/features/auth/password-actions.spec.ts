import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findCoupleMembers: vi.fn(),
  findCredentialHash: vi.fn(),
  replacePartnerCredentials: vi.fn(),
  verify: vi.fn(),
  hash: vi.fn(),
  changePassword: vi.fn(),
  updateDatabase: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleMembers: mocks.findCoupleMembers,
}));
vi.mock('./credential-repository', () => ({
  findCredentialHash: mocks.findCredentialHash,
  replacePartnerCredentials: mocks.replacePartnerCredentials,
}));
vi.mock('@/lib/auth', () => ({
  auth: {
    $context: Promise.resolve({ password: { verify: mocks.verify, hash: mocks.hash } }),
    api: { changePassword: mocks.changePassword },
  },
}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/db/client', () => ({ getDatabase: mocks.updateDatabase }));

import { APIError } from 'better-auth/api';
import { changePasswordAction, resetPartnerPasswordAction } from './password-actions';

describe('changePasswordAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSessionUserId.mockResolvedValue('user-a');
  });

  it('com a senha atual errada falha no campo certo e não mexe no banco', async () => {
    mocks.changePassword.mockRejectedValue(
      new APIError('BAD_REQUEST', { code: 'INVALID_PASSWORD', message: 'Invalid password' }),
    );

    expect(
      await changePasswordAction({ currentPassword: 'errada', newPassword: 'nova-senha-123' }),
    ).toMatchObject({ ok: false, code: 'invalid_input', field: 'currentPassword' });
    expect(mocks.updateDatabase).not.toHaveBeenCalled();
  });

  it('sem sessão recusa antes de chamar o Better Auth', async () => {
    mocks.readSessionUserId.mockResolvedValue(null);

    expect(
      await changePasswordAction({ currentPassword: 'x', newPassword: 'nova-senha-123' }),
    ).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
});

const VALID_INPUT = { currentPassword: 'minha-senha-1', newPassword: 'nova-senha-123' };

describe('resetPartnerPasswordAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSessionUserId.mockResolvedValue('user-a');
    mocks.findMemberContextByUserId.mockResolvedValue({ memberId: 'm1', coupleId: 'c1' });
    mocks.findCoupleMembers.mockResolvedValue([{ userId: 'user-a' }, { userId: 'user-b' }]);
    mocks.findCredentialHash.mockResolvedValue('stored-hash');
    mocks.verify.mockResolvedValue(true);
    mocks.hash.mockResolvedValue('new-hash');
    mocks.replacePartnerCredentials.mockResolvedValue(undefined);
  });

  it('recusa sem sessão e sem vínculo ao casal, sem tocar no banco', async () => {
    mocks.readSessionUserId.mockResolvedValue(null);
    expect(await resetPartnerPasswordAction(VALID_INPUT)).toMatchObject({
      ok: false,
      code: 'unauthenticated',
    });

    mocks.readSessionUserId.mockResolvedValue('user-a');
    mocks.findMemberContextByUserId.mockResolvedValue(null);
    expect(await resetPartnerPasswordAction(VALID_INPUT)).toMatchObject({
      ok: false,
      code: 'couple_required',
    });
    expect(mocks.replacePartnerCredentials).not.toHaveBeenCalled();
  });

  it('recusa com a senha atual errada e não altera o parceiro', async () => {
    mocks.verify.mockResolvedValue(false);

    expect(await resetPartnerPasswordAction(VALID_INPUT)).toMatchObject({
      ok: false,
      code: 'invalid_input',
      field: 'currentPassword',
    });
    expect(mocks.replacePartnerCredentials).not.toHaveBeenCalled();
  });

  it('altera só o parceiro, nunca a própria conta', async () => {
    expect(await resetPartnerPasswordAction(VALID_INPUT)).toEqual({ ok: true, data: null });

    expect(mocks.replacePartnerCredentials).toHaveBeenCalledWith('user-b', 'new-hash');
  });

  it('falha quando não há outra pessoa no casal', async () => {
    mocks.findCoupleMembers.mockResolvedValue([{ userId: 'user-a' }]);

    expect(await resetPartnerPasswordAction(VALID_INPUT)).toMatchObject({
      ok: false,
      code: 'failed',
    });
    expect(mocks.replacePartnerCredentials).not.toHaveBeenCalled();
  });
});
