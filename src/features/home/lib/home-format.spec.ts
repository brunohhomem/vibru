import { describe, expect, it } from 'vitest';
import { nextDateLabel } from './home-format';

describe('nextDateLabel', () => {
  it('Próxima data hoje diz "Hoje", não "em 0 dias"', () => {
    expect(nextDateLabel('2026-11-12', 0)).toBe('Hoje');
  });

  it('Amanhã', () => {
    expect(nextDateLabel('2026-11-13', 1)).toBe('Amanhã');
  });

  it('Mais adiante mostra o dia e a contagem', () => {
    expect(nextDateLabel('2026-12-25', 43)).toBe('25 de dezembro · em 43 dias');
  });
});
