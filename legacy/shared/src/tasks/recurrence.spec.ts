import { describe, expect, it } from 'vitest';
import { addRecurrence, nextRecurrence, startOfWeek } from './recurrence';

describe('addRecurrence', () => {
  it('soma dias em intervalo Diário', () => {
    expect(addRecurrence('2026-01-01', 'daily', 2, 3)).toBe('2026-01-07');
  });

  it('soma semanas', () => {
    expect(addRecurrence('2026-11-02', 'weekly', 1, 2)).toBe('2026-11-16');
  });

  it('cai no último dia dos meses curtos e volta ao dia 31', () => {
    expect(addRecurrence('2026-01-31', 'monthly', 1, 1)).toBe('2026-02-28');
    expect(addRecurrence('2026-01-31', 'monthly', 1, 10)).toBe('2026-11-30');
    expect(addRecurrence('2026-01-31', 'monthly', 1, 11)).toBe('2026-12-31');
  });

  it('celebra 29/02 em 28/02 no ano não bissexto', () => {
    expect(addRecurrence('2024-02-29', 'yearly', 1, 1)).toBe('2025-02-28');
    expect(addRecurrence('2024-02-29', 'yearly', 1, 4)).toBe('2028-02-29');
  });

  it('não muda a âncora quando não repete', () => {
    expect(addRecurrence('2026-01-01', 'none', 1, 3)).toBe('2026-01-01');
  });
});

describe('nextRecurrence', () => {
  it('avança uma semanal concluída com atraso', () => {
    // Toda segunda, prazo 02/11, concluída na quarta 04/11 → 09/11.
    expect(nextRecurrence('2026-11-02', 'weekly', 1, '2026-11-04')).toBe('2026-11-09');
  });

  it('avança uma semanal concluída adiantada', () => {
    // Concluída na sexta 30/10, mas o prazo atual 02/11 ainda é o marco.
    expect(nextRecurrence('2026-11-02', 'weekly', 1, '2026-11-02')).toBe('2026-11-09');
  });

  it('devolve a primeira ocorrência depois do prazo mensal no dia 31', () => {
    expect(nextRecurrence('2026-01-31', 'monthly', 1, '2026-01-31')).toBe('2026-02-28');
    expect(nextRecurrence('2026-01-31', 'monthly', 1, '2026-11-30')).toBe('2026-12-31');
  });

  it('devolve a primeira ocorrência anual depois de 29/02', () => {
    expect(nextRecurrence('2024-02-29', 'yearly', 1, '2024-02-29')).toBe('2025-02-28');
  });
});

describe('startOfWeek', () => {
  it('devolve a segunda-feira da semana', () => {
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02');
  });

  it('trata domingo como último dia da semana', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
  });

  it('devolve a própria segunda-feira', () => {
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  });
});
