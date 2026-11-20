import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  updateUserImage: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('./profile-repository', () => ({
  findProfileByUserId: vi.fn(),
  findUserDisplayName: vi.fn(),
  isCpfUsedByAnotherUser: vi.fn(),
  updateUserImage: mocks.updateUserImage,
  upsertProfile: vi.fn(),
}));

import { removeAvatarAction, updateAvatarAction } from './actions';

const VALID_PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

describe('updateAvatarAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSessionUserId.mockResolvedValue('user-a');
  });

  it('grava a foto só no usuário da sessão', async () => {
    expect(await updateAvatarAction({ image: VALID_PHOTO })).toMatchObject({ ok: true });
    expect(mocks.updateUserImage).toHaveBeenCalledWith('user-a', VALID_PHOTO);
  });

  it('recusa o que não é JPEG em data URL e não grava', async () => {
    expect(await updateAvatarAction({ image: 'https://example.com/foto.jpg' })).toMatchObject({
      ok: false,
      code: 'invalid_input',
    });
    expect(mocks.updateUserImage).not.toHaveBeenCalled();
  });

  it('sem sessão recusa antes de qualquer acesso ao banco', async () => {
    mocks.readSessionUserId.mockResolvedValue(null);

    expect(await updateAvatarAction({ image: VALID_PHOTO })).toMatchObject({
      ok: false,
      code: 'unauthenticated',
    });
    expect(mocks.updateUserImage).not.toHaveBeenCalled();
  });
});

describe('removeAvatarAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSessionUserId.mockResolvedValue('user-a');
  });

  it('apaga a foto do usuário da sessão', async () => {
    expect(await removeAvatarAction(undefined)).toMatchObject({ ok: true });
    expect(mocks.updateUserImage).toHaveBeenCalledWith('user-a', null);
  });

  it('sem sessão recusa e não mexe no banco', async () => {
    mocks.readSessionUserId.mockResolvedValue(null);

    expect(await removeAvatarAction(undefined)).toMatchObject({
      ok: false,
      code: 'unauthenticated',
    });
    expect(mocks.updateUserImage).not.toHaveBeenCalled();
  });
});
