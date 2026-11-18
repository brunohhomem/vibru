import { describe, expect, it } from 'vitest';
import { formatCents, parseReaisToCents } from './money';

describe('Dinheiro em centavos', () => {
  it('Centavos aparecem em reais', () => {
    expect(formatCents(12990)).toBe('R$ 129,90');
    expect(formatCents(0)).toBe('R$ 0,00');
  });

  it('Valor digitado em reais vira centavos', () => {
    expect(parseReaisToCents('129,90')).toBe(12990);
    expect(parseReaisToCents('129')).toBe(12900);
    expect(parseReaisToCents('1.299,9')).toBe(129990);
    expect(parseReaisToCents(' R$ 39,99 ')).toBe(3999);
  });

  it('Valor inválido não vira centavos', () => {
    expect(parseReaisToCents('')).toBeNull();
    expect(parseReaisToCents('abc')).toBeNull();
    expect(parseReaisToCents('-10')).toBeNull();
    expect(parseReaisToCents('10,999')).toBeNull();
  });
});
