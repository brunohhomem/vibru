import { describe, expect, it } from 'vitest';
import type { AgendaEventRow, ImportantDateRow } from '@/db/agenda-schema';
import {
  annualOccurrences,
  buildAnniversaries,
  buildCalendarEntries,
  importantDateOccurrences,
  monthRange,
  pickUpcoming,
} from './agenda-entries';

const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');

function importantDate(overrides: Partial<ImportantDateRow> = {}): ImportantDateRow {
  return {
    id: 'date-1',
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    title: 'Aniversário da Ana',
    occursOn: '1990-05-10',
    repeatsYearly: true,
    ...overrides,
  };
}

function agendaEvent(overrides: Partial<AgendaEventRow> = {}): AgendaEventRow {
  return {
    id: 'event-1',
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    title: 'Jantar',
    startsOn: '2026-06-10',
    startTime: null,
    notes: null,
    wishId: null,
    ...overrides,
  };
}

describe('monthRange', () => {
  it('vai do primeiro ao último dia do mês, inclusive fevereiro bissexto', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('annualOccurrences', () => {
  it('traz uma ocorrência por ano dentro do intervalo, com os anos desde a origem', () => {
    expect(annualOccurrences('2020-05-10', { from: '2026-01-01', to: '2027-12-31' })).toEqual([
      { date: '2026-05-10', years: 6 },
      { date: '2027-05-10', years: 7 },
    ]);
  });

  it('não gera ocorrência antes do ano de origem', () => {
    expect(annualOccurrences('2030-05-10', { from: '2026-01-01', to: '2027-12-31' })).toEqual([]);
  });

  it('29/02 cai em 28/02 nos anos não bissextos', () => {
    expect(annualOccurrences('2020-02-29', { from: '2026-01-01', to: '2028-12-31' })).toEqual([
      { date: '2026-02-28', years: 6 },
      { date: '2027-02-28', years: 7 },
      { date: '2028-02-29', years: 8 },
    ]);
  });

  it('ocorrência fora do intervalo é descartada', () => {
    expect(annualOccurrences('2020-05-10', { from: '2026-06-01', to: '2026-06-30' })).toEqual([]);
  });
});

describe('importantDateOccurrences', () => {
  it('data anual aparece no mês em que cai, com a data da ocorrência', () => {
    const result = importantDateOccurrences(importantDate(), {
      from: '2026-05-01',
      to: '2026-05-31',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'date-1', occursOn: '1990-05-10', date: '2026-05-10' });
  });

  it('data não anual só aparece no intervalo que contém o dia cadastrado', () => {
    const row = importantDate({ repeatsYearly: false, occursOn: '2026-05-10' });

    expect(importantDateOccurrences(row, { from: '2026-05-01', to: '2026-05-31' })).toHaveLength(1);
    expect(importantDateOccurrences(row, { from: '2026-06-01', to: '2026-06-30' })).toEqual([]);
    expect(importantDateOccurrences(row, { from: '2027-05-01', to: '2027-05-31' })).toEqual([]);
  });
});

describe('buildAnniversaries', () => {
  const range = { from: '2026-01-01', to: '2026-12-31' };

  it('sem data do casal não há aniversário', () => {
    expect(buildAnniversaries(null, range, 'wedding')).toEqual([]);
  });

  it('só conta a partir de 1 ano completo (o dia da data em si não é aniversário)', () => {
    expect(buildAnniversaries('2026-03-01', range, 'dating')).toEqual([]);
  });

  it('casamento usa o nome das bodas', () => {
    expect(buildAnniversaries('2001-03-01', range, 'wedding')).toEqual([
      { kind: 'wedding', date: '2026-03-01', years: 25, title: 'Bodas de Prata (25 anos)' },
    ]);
  });

  it('namoro conta anos no singular e no plural', () => {
    expect(buildAnniversaries('2025-03-01', range, 'dating')[0]?.title).toBe('1 ano de namoro');
    expect(buildAnniversaries('2024-03-01', range, 'dating')[0]?.title).toBe('2 anos de namoro');
  });
});

describe('buildCalendarEntries', () => {
  it('reúne eventos, datas importantes e aniversários do casal, ordenados por data', () => {
    const entries = buildCalendarEntries(
      {
        couple: { marriedOn: '2020-06-05', datingStartedOn: null },
        events: [agendaEvent()],
        importantDates: [importantDate({ occursOn: '1990-06-01' })],
      },
      { from: '2026-06-01', to: '2026-06-30' },
    );

    expect(entries.events.map((event) => event.id)).toEqual(['event-1']);
    expect(entries.importantDates.map((item) => item.date)).toEqual(['2026-06-01']);
    expect(entries.anniversaries).toEqual([
      { kind: 'wedding', date: '2026-06-05', years: 6, title: 'Bodas de Perfume (6 anos)' },
    ]);
  });
});

describe('pickUpcoming', () => {
  const today = '2026-06-01';
  const none = { events: [], importantDates: [], anniversaries: [] };

  it('sem nada na janela não há próxima data', () => {
    expect(pickUpcoming(none, today)).toBeNull();
  });

  it('escolhe a mais próxima e informa quantos dias faltam', () => {
    const next = pickUpcoming(
      {
        ...none,
        events: [
          {
            id: 'e1',
            title: 'Longe',
            startsOn: '2026-07-01',
            startTime: null,
            notes: null,
            wishId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'e2',
            title: 'Perto',
            startsOn: '2026-06-04',
            startTime: null,
            notes: null,
            wishId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      today,
    );

    expect(next).toEqual({ kind: 'event', date: '2026-06-04', title: 'Perto', daysUntil: 3 });
  });

  it('no mesmo dia: data do casal antes de data importante, antes de evento', () => {
    const event = {
      id: 'e',
      title: 'Evento',
      startsOn: '2026-06-10',
      startTime: null,
      notes: null,
      wishId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const important = {
      id: 'd',
      title: 'Data',
      occursOn: '2000-06-10',
      repeatsYearly: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      date: '2026-06-10',
    };
    const wedding = { kind: 'wedding' as const, date: '2026-06-10', years: 6, title: 'Bodas' };

    expect(
      pickUpcoming({ events: [event], importantDates: [important], anniversaries: [] }, today)
        ?.kind,
    ).toBe('important_date');
    expect(
      pickUpcoming(
        { events: [event], importantDates: [important], anniversaries: [wedding] },
        today,
      )?.kind,
    ).toBe('wedding');
  });

  it('no mesmo dia, evento sem horário vem antes do evento com horário', () => {
    const base = {
      startsOn: '2026-06-10',
      notes: null,
      wishId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const next = pickUpcoming(
      {
        ...none,
        events: [
          { ...base, id: 'a', title: 'Com horário', startTime: '09:00' },
          { ...base, id: 'b', title: 'Dia todo', startTime: null },
        ],
      },
      today,
    );

    expect(next?.title).toBe('Dia todo');
  });
});
