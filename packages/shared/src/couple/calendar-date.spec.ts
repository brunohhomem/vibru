import { describe, expect, it } from 'vitest';
import { daysBetween, elapsedParts, nextAnnualOccurrence, todayInSaoPaulo } from './calendar-date';

describe('todayInSaoPaulo', () => {
  it('usa o dia anterior quando em UTC já virou o dia', () => {
    // 2026-03-02T02:30:00Z = 2026-03-01T23:30:00 em America/Sao_Paulo.
    expect(todayInSaoPaulo(new Date('2026-03-02T02:30:00.000Z'))).toBe('2026-03-01');
  });

  it('vira o dia em São Paulo depois da meia-noite local', () => {
    expect(todayInSaoPaulo(new Date('2026-03-02T03:00:00.000Z'))).toBe('2026-03-02');
  });
});

describe('daysBetween', () => {
  it('conta dias civis sem fuso', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('atravessa ano bissexto', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  it('devolve zero para o mesmo dia', () => {
    expect(daysBetween('2026-10-28', '2026-10-28')).toBe(0);
  });
});

describe('elapsedParts', () => {
  it('decompõe anos, meses e dias', () => {
    expect(elapsedParts('2020-05-10', '2026-10-28')).toEqual({
      years: 6,
      months: 5,
      days: 18,
      totalDays: 2362,
    });
  });

  it('conta aniversário hoje como período completo', () => {
    expect(elapsedParts('2020-10-28', '2026-10-28')).toEqual({
      years: 6,
      months: 0,
      days: 0,
      totalDays: 2191,
    });
  });

  it('zera o período quando a data inicial está no futuro', () => {
    expect(elapsedParts('2027-01-01', '2026-10-28')).toEqual({
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
    });
  });

  it('empresta dias do mês anterior', () => {
    expect(elapsedParts('2026-01-31', '2026-03-01')).toEqual({
      years: 0,
      months: 1,
      days: 1,
      totalDays: 29,
    });
  });
});

describe('nextAnnualOccurrence', () => {
  it('conta hoje como a próxima ocorrência', () => {
    expect(nextAnnualOccurrence('2019-10-28', '2026-10-28')).toBe('2026-10-28');
  });

  it('avança para o ano seguinte quando a data já passou', () => {
    expect(nextAnnualOccurrence('2019-10-27', '2026-10-28')).toBe('2027-10-27');
  });

  it('celebra 29/02 em 28/02 no ano não bissexto', () => {
    expect(nextAnnualOccurrence('2024-02-29', '2026-01-15')).toBe('2026-02-28');
  });

  it('celebra 29/02 no próprio dia em ano bissexto', () => {
    expect(nextAnnualOccurrence('2024-02-29', '2028-01-15')).toBe('2028-02-29');
  });
});
