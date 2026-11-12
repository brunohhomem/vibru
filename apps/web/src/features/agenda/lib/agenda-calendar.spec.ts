import type { AgendaResponse } from '@vibru/shared';
import { describe, expect, it } from 'vitest';
import { agendaDays, monthGrid, monthLabel, shiftMonth } from './agenda-calendar';

describe('Calendário da agenda', () => {
  it('Virada de ano ao trocar de mês', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
  });

  it('Grade começa no dia da semana certo', () => {
    // 1º de novembro de 2026 é domingo; 1º de dezembro é terça.
    expect(monthGrid('2026-11')[0]).toBe('2026-11-01');
    expect(monthGrid('2026-12').slice(0, 3)).toEqual([null, null, '2026-12-01']);
    expect(monthGrid('2028-02').at(-1)).toBe('2028-02-29');
  });

  it('Rótulo do mês não depende do fuso', () => {
    expect(monthLabel('2026-12')).toBe('dezembro de 2026');
  });

  it('Dias da agenda juntam datas e eventos, com o horário no título', () => {
    const agenda: AgendaResponse = {
      month: '2026-12',
      today: '2026-11-06',
      events: [
        {
          id: '1',
          title: 'Jantar',
          startsOn: '2026-12-10',
          startTime: '20:30',
          notes: null,
          createdAt: '',
        },
      ],
      importantDates: [
        {
          id: '2',
          title: 'Aniversário',
          occursOn: '1960-12-10',
          repeatsYearly: true,
          createdAt: '',
          date: '2026-12-10',
        },
      ],
      anniversaries: [
        { kind: 'wedding', date: '2026-12-01', years: 1, title: 'Bodas de Papel (1 ano)' },
      ],
    };

    expect(
      agendaDays(agenda).map((day) => [day.date, day.entries.map((entry) => entry.title)]),
    ).toEqual([
      ['2026-12-01', ['Bodas de Papel (1 ano)']],
      ['2026-12-10', ['Aniversário', '20:30 · Jantar']],
    ]);
  });
});
