import { describe, expect, it } from 'vitest';
import { normalizeListTitle, pickExistingOpenItem } from './named-list';

describe('normalizeListTitle', () => {
  it('ignora acento, caixa e espaços nas pontas', () => {
    expect(normalizeListTitle(' Farmácia ')).toBe('farmacia');
    expect(normalizeListTitle('FARMACIA')).toBe('farmacia');
  });

  it('não junta títulos diferentes', () => {
    expect(normalizeListTitle('Farmácia')).not.toBe(normalizeListTitle('Mercado'));
  });
});

describe('pickExistingOpenItem', () => {
  const items = [
    { id: 'a', title: 'Dipirona 500mg', checkedAt: null },
    { id: 'b', title: 'Ibuprofeno', checkedAt: new Date('2026-10-01T10:00:00.000Z') },
  ];

  it('acha item aberto pelo nome, sem acento nem caixa', () => {
    expect(pickExistingOpenItem(items, 'dipirona 500MG')).toEqual({
      id: 'a',
      title: 'Dipirona 500mg',
    });
  });

  it('ignora item já marcado', () => {
    expect(pickExistingOpenItem(items, 'Ibuprofeno')).toBeNull();
  });

  it('devolve null quando não há item igual', () => {
    expect(pickExistingOpenItem(items, 'Vitamina C')).toBeNull();
  });
});
