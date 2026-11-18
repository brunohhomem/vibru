import { describe, expect, it } from 'vitest';
import { findPartnerUserId } from './password-rules';

describe('findPartnerUserId', () => {
  it('devolve o outro usuário do casal', () => {
    const members = [{ userId: 'user-a' }, { userId: 'user-b' }];
    expect(findPartnerUserId(members, 'user-a')).toBe('user-b');
    expect(findPartnerUserId(members, 'user-b')).toBe('user-a');
  });

  it('devolve null quando só o próprio usuário está no casal', () => {
    expect(findPartnerUserId([{ userId: 'user-a' }], 'user-a')).toBeNull();
  });

  it('nunca devolve o próprio id', () => {
    const members = [{ userId: 'user-a' }, { userId: 'user-a' }];
    expect(findPartnerUserId(members, 'user-a')).toBeNull();
  });
});
