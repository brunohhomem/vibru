import { describe, expect, it } from 'vitest';
import { readSeedUsersFromEnv } from './seed-users-from-env';

const completeEnvironment = {
  SEED_USER_ONE_EMAIL: 'um@example.com',
  SEED_USER_ONE_PASSWORD: 'senha-um-12345',
  SEED_USER_TWO_EMAIL: 'dois@example.com',
  SEED_USER_TWO_PASSWORD: 'senha-dois-12345',
};

describe('readSeedUsersFromEnv', () => {
  it('devolve os 2 usuários quando as 4 variáveis existem', () => {
    expect(readSeedUsersFromEnv(completeEnvironment)).toEqual([
      { email: 'um@example.com', password: 'senha-um-12345', name: 'um' },
      { email: 'dois@example.com', password: 'senha-dois-12345', name: 'dois' },
    ]);
  });

  it('falha listando todas as variáveis que faltam', () => {
    expect(() =>
      readSeedUsersFromEnv({ SEED_USER_ONE_EMAIL: 'um@example.com', SEED_USER_TWO_PASSWORD: ' ' }),
    ).toThrowError(/SEED_USER_ONE_PASSWORD[\s\S]*SEED_USER_TWO_EMAIL[\s\S]*SEED_USER_TWO_PASSWORD/);
  });
});
