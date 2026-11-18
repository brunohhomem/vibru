import { describe, expect, it } from 'vitest';
import { buildProfileResponse, buildProfileUpdates } from './profile-response';

describe('buildProfileResponse', () => {
  it('troca nome nulo por texto vazio', () => {
    expect(
      buildProfileResponse({ email: 'a@b.com', fullName: null, cpf: null, phone: null }),
    ).toEqual({ email: 'a@b.com', fullName: '', cpf: null, phone: null });
  });

  it('repassa os dados preenchidos', () => {
    expect(
      buildProfileResponse({
        email: 'a@b.com',
        fullName: 'Ana',
        cpf: '52998224725',
        phone: '11987654321',
      }),
    ).toEqual({ email: 'a@b.com', fullName: 'Ana', cpf: '52998224725', phone: '11987654321' });
  });
});

describe('buildProfileUpdates', () => {
  it('leva só os campos enviados, sem apagar os outros', () => {
    expect(buildProfileUpdates({ phone: '11987654321' })).toEqual({ phone: '11987654321' });
    expect(buildProfileUpdates({ fullName: 'Ana', cpf: '52998224725' })).toEqual({
      fullName: 'Ana',
      cpf: '52998224725',
    });
  });
});
