import { describe, expect, it } from 'vitest';
import { compareTasksByDue, groupTasks } from './grouping';

type Row = { id: string; dueOn: string | null; createdAt: string };

function row(id: string, dueOn: string | null, createdAt = '2026-10-01T10:00:00.000Z'): Row {
  return { id, dueOn, createdAt };
}

describe('groupTasks', () => {
  it('separa atrasadas, hoje, esta semana, mais pra frente e sem prazo', () => {
    const groups = groupTasks(
      [
        row('hoje', '2026-11-02'),
        row('ontem', '2026-11-01'),
        row('domingo', '2026-11-08'),
        row('proxima', '2026-11-09'),
        row('sem-prazo', null),
      ],
      '2026-11-02',
    );

    expect(groups.today.map((task) => task.id)).toEqual(['hoje']);
    expect(groups.overdue.map((task) => task.id)).toEqual(['ontem']);
    expect(groups.thisWeek.map((task) => task.id)).toEqual(['domingo']);
    expect(groups.later.map((task) => task.id)).toEqual(['proxima']);
    expect(groups.noDueDate.map((task) => task.id)).toEqual(['sem-prazo']);
  });

  it('ordena por prazo e, no empate, por criação', () => {
    const groups = groupTasks(
      [
        row('segundo', '2026-11-05', '2026-10-02T10:00:00.000Z'),
        row('primeiro', '2026-11-05', '2026-10-01T10:00:00.000Z'),
        row('antes', '2026-11-04', '2026-10-03T10:00:00.000Z'),
      ],
      '2026-11-02',
    );

    expect(groups.thisWeek.map((task) => task.id)).toEqual(['antes', 'primeiro', 'segundo']);
  });

  it('ordena sem prazo pela criação', () => {
    const groups = groupTasks(
      [
        row('depois', null, '2026-10-02T10:00:00.000Z'),
        row('antes', null, '2026-10-01T10:00:00.000Z'),
      ],
      '2026-11-02',
    );

    expect(groups.noDueDate.map((task) => task.id)).toEqual(['antes', 'depois']);
  });
});

describe('compareTasksByDue', () => {
  it('ordena pelo horário dentro do dia, com horário antes de sem horário', () => {
    const tasks = [
      { id: 'sem-hora', dueOn: '2026-11-02', dueTime: null, createdAt: '2026-10-01T10:00:00.000Z' },
      { id: 'noite', dueOn: '2026-11-02', dueTime: '20:00', createdAt: '2026-10-01T10:00:00.000Z' },
      { id: 'manha', dueOn: '2026-11-02', dueTime: '08:00', createdAt: '2026-10-01T10:00:00.000Z' },
    ];

    expect(tasks.sort(compareTasksByDue).map((task) => task.id)).toEqual([
      'manha',
      'noite',
      'sem-hora',
    ]);
  });
});
