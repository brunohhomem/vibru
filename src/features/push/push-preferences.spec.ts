import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  isPushKindEnabled,
  resolvePreferences,
  updatePreferencesSchema,
} from './push-preferences';

describe('resolvePreferences', () => {
  it('sem linha salva vale o padrão', () => {
    expect(resolvePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it('o que foi salvo vence o padrão e o resto continua no padrão', () => {
    expect(resolvePreferences({ taskCompleted: false })).toEqual({
      ...DEFAULT_PREFERENCES,
      taskCompleted: false,
    });
  });
});

describe('isPushKindEnabled', () => {
  it('estoque baixo nasce desligado, por falar de remédio', () => {
    expect(isPushKindEnabled(null, 'lowStock')).toBe(false);
  });

  it('os demais avisos nascem ligados', () => {
    expect(isPushKindEnabled(null, 'taskAssigned')).toBe(true);
    expect(isPushKindEnabled(null, 'dailySummary')).toBe(true);
  });

  it('respeita o que a pessoa escolheu', () => {
    expect(isPushKindEnabled({ taskAssigned: false }, 'taskAssigned')).toBe(false);
    expect(isPushKindEnabled({ lowStock: true }, 'lowStock')).toBe(true);
  });
});

describe('updatePreferencesSchema', () => {
  it('aceita só o campo que mudou', () => {
    expect(updatePreferencesSchema.safeParse({ lowStock: true }).success).toBe(true);
  });

  it('recusa pedido vazio', () => {
    expect(updatePreferencesSchema.safeParse({}).success).toBe(false);
  });

  it('recusa valor que não é verdadeiro ou falso', () => {
    expect(updatePreferencesSchema.safeParse({ lowStock: 'sim' }).success).toBe(false);
  });
});
