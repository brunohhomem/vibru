import { describe, expect, it } from 'vitest';
import type { AgendaEventRow, ImportantDateRow } from '@/db/agenda-schema';
import { toAgendaEvent, toImportantDate } from './agenda-mappers';
import { toWish } from '@/features/wishes/wish-mappers';

const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

describe('toAgendaEvent', () => {
  it('corta os segundos do horário e usa ISO na criação', () => {
    const row: AgendaEventRow = {
      id: 'e1',
      isActive: true,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      coupleId: 'couple-1',
      title: 'Jantar',
      startsOn: '2026-06-10',
      startTime: '20:30:00',
      notes: 'obs',
      wishId: 'wish-1',
    };

    expect(toAgendaEvent(row)).toEqual({
      id: 'e1',
      title: 'Jantar',
      startsOn: '2026-06-10',
      startTime: '20:30',
      notes: 'obs',
      wishId: 'wish-1',
      createdAt: '2026-10-01T10:00:00.000Z',
    });
  });

  it('evento sem horário continua com horário nulo', () => {
    expect(
      toAgendaEvent({
        id: 'e1',
        isActive: true,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        coupleId: 'couple-1',
        title: 'Dia todo',
        startsOn: '2026-06-10',
        startTime: null,
        notes: null,
        wishId: null,
      }).startTime,
    ).toBeNull();
  });
});

describe('toImportantDate', () => {
  it('leva a data cadastrada, a repetição anual e a criação em ISO', () => {
    const row: ImportantDateRow = {
      id: 'd1',
      isActive: true,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      coupleId: 'couple-1',
      title: 'Aniversário',
      occursOn: '1990-05-10',
      repeatsYearly: true,
    };

    expect(toImportantDate(row)).toEqual({
      id: 'd1',
      title: 'Aniversário',
      occursOn: '1990-05-10',
      repeatsYearly: true,
      createdAt: '2026-10-01T10:00:00.000Z',
    });
  });
});

describe('toWish', () => {
  it('leva a data planejada, a conclusão em ISO e nenhum dado interno', () => {
    const wish = toWish({
      id: 'w1',
      isActive: true,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      coupleId: 'couple-1',
      title: 'Viagem',
      category: 'travel',
      url: null,
      imageUrl: null,
      priceCents: null,
      notes: null,
      doneAt: new Date('2026-10-05T10:00:00.000Z'),
      plannedOn: '2026-12-20',
    });

    expect(wish).toMatchObject({
      id: 'w1',
      doneAt: '2026-10-05T10:00:00.000Z',
      plannedOn: '2026-12-20',
      createdAt: '2026-10-01T10:00:00.000Z',
    });
    expect(wish).not.toHaveProperty('coupleId');
  });
});
