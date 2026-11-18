import type { Wish } from '@vibru/shared';
import { describe, expect, it } from 'vitest';
import { pickDateIdea } from './pick-date-idea';

function wish(overrides: Partial<Wish>): Wish {
  return {
    id: crypto.randomUUID(),
    title: 'Ideia',
    category: 'date_idea',
    url: null,
    imageUrl: null,
    priceCents: null,
    notes: null,
    doneAt: null,
    plannedOn: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('pickDateIdea', () => {
  it('Devolve a ideia de rolê aberta mais antiga', () => {
    const newest = wish({ title: 'Nova', createdAt: '2026-11-10T10:00:00.000Z' });
    const oldest = wish({ title: 'Antiga', createdAt: '2026-10-01T10:00:00.000Z' });

    expect(pickDateIdea([newest, oldest])?.title).toBe('Antiga');
  });

  it('Ignora a ideia já planejada, a concluída e a de outra categoria', () => {
    const candidates = [
      wish({ title: 'Planejada', plannedOn: '2026-11-20', createdAt: '2026-01-01T00:00:00Z' }),
      wish({ title: 'Feita', doneAt: '2026-11-02T00:00:00Z', createdAt: '2026-01-02T00:00:00Z' }),
      wish({ title: 'Filme', category: 'movie', createdAt: '2026-01-03T00:00:00Z' }),
      wish({ title: 'Disponível', createdAt: '2026-06-01T00:00:00Z' }),
    ];

    expect(pickDateIdea(candidates)?.title).toBe('Disponível');
  });

  it('Lista sem ideia disponível não tem bloco', () => {
    expect(pickDateIdea([])).toBeUndefined();
    expect(pickDateIdea([wish({ category: 'travel' })])).toBeUndefined();
  });
});
