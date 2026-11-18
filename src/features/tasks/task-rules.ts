import type { NewTaskRow, TaskRow } from '@/db/tasks-schema';
import { nextRecurrence, type TaskRecurrenceKind } from './recurrence';
import type { Task, UpdateTaskRequest } from './task-schemas';
import type { CalendarDate } from '@/lib/calendar-date';

const TIME_WITHOUT_SECONDS_LENGTH = 5;

export type TaskInputIssue = { field: 'dueOn' | 'dueTime'; message: string };

export function findTaskInputIssue(input: {
  dueOn: string | null;
  dueTime: string | null;
  recurrenceKind: TaskRecurrenceKind;
}): TaskInputIssue | null {
  if (input.recurrenceKind !== 'none' && !input.dueOn) {
    return { field: 'dueOn', message: 'Tarefa recorrente precisa de prazo' };
  }
  if (input.dueTime && !input.dueOn) {
    return { field: 'dueTime', message: 'Informe o prazo antes do horário' };
  }
  return null;
}

/** Campos que só o remédio pode mudar; `notes` continua livre. */
export function changesMedicationLockedFields(patch: UpdateTaskRequest): boolean {
  return [
    patch.title,
    patch.assigneeMemberId,
    patch.category,
    patch.dueTime,
    patch.dueOn,
    patch.recurrence,
  ].some((value) => value !== undefined);
}

/** Horário efetivo após a edição: limpar o prazo limpa o horário, sem deixá-lo órfão. */
export function resolveDueTime(
  existingDueTime: string | null,
  patchDueTime: string | null | undefined,
  dueOn: string | null,
): string | null {
  if (patchDueTime !== undefined) return patchDueTime;
  if (dueOn === null) return null;
  return existingDueTime;
}

export function resolveRecurrenceAnchor(
  existing: { kind: TaskRecurrenceKind; anchorOn: string | null },
  patch: { dueOn?: string | null },
  recurrenceKind: TaskRecurrenceKind,
  dueOn: string | null,
): string | null {
  if (recurrenceKind === 'none') return null;
  if (patch.dueOn !== undefined) return dueOn;
  if (existing.kind === 'none') return dueOn;
  return existing.anchorOn ?? dueOn;
}

/**
 * Próxima ocorrência de uma tarefa recorrente recém-concluída. A base é o maior
 * entre o prazo atual e hoje, para concluir atrasado não gerar uma tarefa já vencida.
 */
export function buildNextOccurrence(completed: TaskRow, today: CalendarDate): NewTaskRow | null {
  if (completed.recurrenceKind === 'none') return null;

  const anchor = completed.recurrenceAnchorOn;
  const currentDue = completed.dueOn;
  if (!anchor || !currentDue) throw new Error('Tarefa recorrente sem âncora ou prazo');

  const after = currentDue > today ? currentDue : today;
  return {
    coupleId: completed.coupleId,
    title: completed.title,
    notes: completed.notes,
    assigneeMemberId: completed.assigneeMemberId,
    dueOn: nextRecurrence(anchor, completed.recurrenceKind, completed.recurrenceInterval, after),
    dueTime: completed.dueTime,
    category: completed.category,
    medicationId: completed.medicationId,
    recurrenceKind: completed.recurrenceKind,
    recurrenceInterval: completed.recurrenceInterval,
    recurrenceAnchorOn: anchor,
    generatedFromTaskId: completed.id,
  };
}

/** Filho gerado que ninguém editou: reabrir o pai pode apagá-lo sem perder trabalho. */
export function isUntouchedChild(task: Pick<TaskRow, 'createdAt' | 'updatedAt'>): boolean {
  return task.updatedAt.getTime() === task.createdAt.getTime();
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    assigneeMemberId: row.assigneeMemberId,
    dueOn: row.dueOn,
    dueTime: row.dueTime ? row.dueTime.slice(0, TIME_WITHOUT_SECONDS_LENGTH) : null,
    category: row.category,
    medicationId: row.medicationId,
    recurrence: { kind: row.recurrenceKind, interval: row.recurrenceInterval },
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    completedByMemberId: row.completedByMemberId,
    createdAt: row.createdAt.toISOString(),
  };
}
