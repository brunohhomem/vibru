import { describe, expect, it } from 'vitest';
import { medicationProgressToday } from './medication-progress';

const TODAY = '2026-11-02';

describe('medicationProgressToday', () => {
  it('soma as tomadas concluídas hoje e as abertas com prazo até hoje', () => {
    const progress = medicationProgressToday(
      {
        open: [
          { medicationId: 'm1', dueOn: '2026-11-02', completedAt: null },
          { medicationId: 'm1', dueOn: '2026-11-03', completedAt: null },
        ],
        completedThisWeek: [
          { medicationId: 'm1', dueOn: '2026-11-02', completedAt: '2026-11-02T11:00:00.000Z' },
          { medicationId: 'm1', dueOn: '2026-11-01', completedAt: '2026-11-01T11:00:00.000Z' },
        ],
      },
      TODAY,
    );

    expect(progress).toEqual({ done: 1, total: 2 });
  });

  it('ignora tarefas que não são de remédio', () => {
    const progress = medicationProgressToday(
      {
        open: [{ medicationId: null, dueOn: TODAY, completedAt: null }],
        completedThisWeek: [
          { medicationId: null, dueOn: TODAY, completedAt: '2026-11-02T11:00:00.000Z' },
        ],
      },
      TODAY,
    );

    expect(progress).toEqual({ done: 0, total: 0 });
  });

  it('conta a data civil de São Paulo, não a do UTC', () => {
    const progress = medicationProgressToday(
      {
        open: [],
        completedThisWeek: [
          { medicationId: 'm1', dueOn: TODAY, completedAt: '2026-11-03T01:30:00.000Z' },
        ],
      },
      TODAY,
    );

    expect(progress).toEqual({ done: 1, total: 1 });
  });
});
