import { describe, expect, it } from 'vitest';
import type { TaskRow } from '@/db/tasks-schema';
import {
  buildNextOccurrence,
  changesMedicationLockedFields,
  findTaskInputIssue,
  isUntouchedChild,
  resolveDueTime,
  resolveRecurrenceAnchor,
  toTask,
} from './task-rules';

function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    coupleId: 'couple-1',
    title: 'Lavar o carro',
    notes: null,
    assigneeMemberId: null,
    dueOn: '2026-10-10',
    dueTime: null,
    category: 'home',
    medicationId: null,
    recurrenceKind: 'none',
    recurrenceInterval: 1,
    recurrenceAnchorOn: null,
    completedAt: null,
    completedByMemberId: null,
    generatedFromTaskId: null,
    ...overrides,
  };
}

describe('findTaskInputIssue', () => {
  it('aceita tarefa sem prazo e sem recorrência', () => {
    expect(findTaskInputIssue({ dueOn: null, dueTime: null, recurrenceKind: 'none' })).toBeNull();
  });

  it('recusa recorrência sem prazo, no campo do prazo', () => {
    expect(findTaskInputIssue({ dueOn: null, dueTime: null, recurrenceKind: 'weekly' })).toEqual({
      field: 'dueOn',
      message: 'Tarefa recorrente precisa de prazo',
    });
  });

  it('recusa horário sem prazo, no campo do horário', () => {
    expect(findTaskInputIssue({ dueOn: null, dueTime: '09:00', recurrenceKind: 'none' })).toEqual({
      field: 'dueTime',
      message: 'Informe o prazo antes do horário',
    });
  });

  it('aceita horário e recorrência quando há prazo', () => {
    expect(
      findTaskInputIssue({ dueOn: '2026-10-10', dueTime: '09:00', recurrenceKind: 'daily' }),
    ).toBeNull();
  });
});

describe('changesMedicationLockedFields', () => {
  it('só as observações são livres', () => {
    expect(changesMedicationLockedFields({ notes: 'tomar com água' })).toBe(false);
  });

  it('título, responsável, categoria, horário, prazo e recorrência são travados', () => {
    expect(changesMedicationLockedFields({ title: 'x' })).toBe(true);
    expect(changesMedicationLockedFields({ assigneeMemberId: null })).toBe(true);
    expect(changesMedicationLockedFields({ category: 'home' })).toBe(true);
    expect(changesMedicationLockedFields({ dueTime: null })).toBe(true);
    expect(changesMedicationLockedFields({ dueOn: null })).toBe(true);
    expect(changesMedicationLockedFields({ recurrence: { kind: 'none', interval: 1 } })).toBe(true);
  });
});

describe('resolveDueTime', () => {
  it('limpar o prazo limpa o horário junto', () => {
    expect(resolveDueTime('09:00:00', undefined, null)).toBeNull();
  });

  it('mantém o horário quando o pedido não o menciona', () => {
    expect(resolveDueTime('09:00:00', undefined, '2026-10-10')).toBe('09:00:00');
  });

  it('o horário enviado vale, inclusive nulo', () => {
    expect(resolveDueTime('09:00:00', '18:30', '2026-10-10')).toBe('18:30');
    expect(resolveDueTime('09:00:00', null, '2026-10-10')).toBeNull();
  });
});

describe('resolveRecurrenceAnchor', () => {
  it('voltar a não recorrente zera a âncora', () => {
    expect(
      resolveRecurrenceAnchor({ kind: 'weekly', anchorOn: '2026-10-01' }, {}, 'none', '2026-10-01'),
    ).toBeNull();
  });

  it('mudar o prazo muda a âncora', () => {
    expect(
      resolveRecurrenceAnchor(
        { kind: 'weekly', anchorOn: '2026-10-01' },
        { dueOn: '2026-10-08' },
        'weekly',
        '2026-10-08',
      ),
    ).toBe('2026-10-08');
  });

  it('sem mexer no prazo, mantém a âncora antiga', () => {
    expect(
      resolveRecurrenceAnchor(
        { kind: 'weekly', anchorOn: '2026-10-01' },
        {},
        'weekly',
        '2026-10-15',
      ),
    ).toBe('2026-10-01');
  });

  it('passar de não recorrente para recorrente ancora no prazo atual', () => {
    expect(
      resolveRecurrenceAnchor({ kind: 'none', anchorOn: null }, {}, 'monthly', '2026-10-10'),
    ).toBe('2026-10-10');
  });
});

describe('buildNextOccurrence', () => {
  it('não gera nada para tarefa que não repete', () => {
    expect(buildNextOccurrence(taskRow(), '2026-10-10')).toBeNull();
  });

  it('com prazo no passado, a próxima parte de hoje, mantendo a âncora', () => {
    const completed = taskRow({
      recurrenceKind: 'weekly',
      recurrenceInterval: 1,
      recurrenceAnchorOn: '2026-10-01',
      dueOn: '2026-10-01',
      dueTime: '09:00:00',
      notes: 'nota',
    });

    expect(buildNextOccurrence(completed, '2026-10-12')).toMatchObject({
      coupleId: 'couple-1',
      title: 'Lavar o carro',
      notes: 'nota',
      dueOn: '2026-10-15',
      dueTime: '09:00:00',
      recurrenceKind: 'weekly',
      recurrenceAnchorOn: '2026-10-01',
      generatedFromTaskId: 'task-1',
    });
  });

  it('com prazo no futuro, a próxima parte do prazo', () => {
    const completed = taskRow({
      recurrenceKind: 'daily',
      recurrenceAnchorOn: '2026-10-20',
      dueOn: '2026-10-20',
    });

    expect(buildNextOccurrence(completed, '2026-10-12')?.dueOn).toBe('2026-10-21');
  });

  it('lança quando a tarefa recorrente não tem âncora ou prazo', () => {
    expect(() =>
      buildNextOccurrence(
        taskRow({ recurrenceKind: 'daily', recurrenceAnchorOn: null }),
        '2026-10-12',
      ),
    ).toThrow();
  });
});

describe('isUntouchedChild', () => {
  it('é intocada quando criação e atualização coincidem', () => {
    expect(isUntouchedChild(taskRow())).toBe(true);
  });

  it('deixa de ser intocada depois de qualquer edição', () => {
    expect(isUntouchedChild(taskRow({ updatedAt: new Date('2026-10-02T10:00:00.000Z') }))).toBe(
      false,
    );
  });
});

describe('toTask', () => {
  it('corta os segundos do horário e usa ISO nas datas', () => {
    const task = toTask(
      taskRow({
        dueTime: '09:30:00',
        completedAt: new Date('2026-10-05T12:00:00.000Z'),
        completedByMemberId: 'member-1',
        recurrenceKind: 'monthly',
        recurrenceInterval: 2,
      }),
    );

    expect(task).toMatchObject({
      id: 'task-1',
      dueTime: '09:30',
      completedAt: '2026-10-05T12:00:00.000Z',
      completedByMemberId: 'member-1',
      recurrence: { kind: 'monthly', interval: 2 },
      createdAt: '2026-10-01T10:00:00.000Z',
    });
  });

  it('horário ausente continua nulo', () => {
    expect(toTask(taskRow()).dueTime).toBeNull();
  });
});
