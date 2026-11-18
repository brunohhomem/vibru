import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const validRawEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3100',
};

describe('parseEnv', () => {
  it('lista DATABASE_URL e BETTER_AUTH_SECRET quando o ambiente está vazio', () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/);
  });

  it('rejeita BETTER_AUTH_SECRET com 31 caracteres', () => {
    expect(() => parseEnv({ ...validRawEnv, BETTER_AUTH_SECRET: 'a'.repeat(31) })).toThrowError(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('aceita BETTER_AUTH_SECRET com 32 caracteres', () => {
    expect(parseEnv(validRawEnv).BETTER_AUTH_SECRET).toBe('a'.repeat(32));
  });

  it('usa 1 como DATABASE_POOL_MAX quando ausente', () => {
    expect(parseEnv(validRawEnv).DATABASE_POOL_MAX).toBe(1);
  });

  it('expõe DATABASE_URL_UNPOOLED para migrations quando informado', () => {
    const unpooledUrl = 'postgres://user:pass@host.neon.tech/app';
    expect(
      parseEnv({ ...validRawEnv, DATABASE_URL_UNPOOLED: unpooledUrl }).DATABASE_URL_UNPOOLED,
    ).toBe(unpooledUrl);
  });

  it('converte DATABASE_POOL_MAX de texto para número', () => {
    expect(parseEnv({ ...validRawEnv, DATABASE_POOL_MAX: '5' }).DATABASE_POOL_MAX).toBe(5);
  });
});
