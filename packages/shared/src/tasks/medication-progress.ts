import { todayInSaoPaulo, type CalendarDate } from '../couple/calendar-date';

export type MedicationProgressTask = {
  medicationId: string | null;
  dueOn: CalendarDate | null;
  completedAt: string | null;
};

export type MedicationProgress = {
  done: number;
  total: number;
};

/**
 * "Remédios de hoje: N de M". O total soma as tomadas já concluídas hoje e as
 * abertas com prazo até hoje (atrasadas ainda pendem). Tarefas que não são de
 * remédio não entram.
 */
export function medicationProgressToday(
  tasks: {
    open: readonly MedicationProgressTask[];
    completedThisWeek: readonly MedicationProgressTask[];
  },
  today: CalendarDate,
): MedicationProgress {
  const done = tasks.completedThisWeek.filter(
    (task) => task.medicationId !== null && wasCompletedOn(task, today),
  ).length;

  const pending = tasks.open.filter(
    (task) => task.medicationId !== null && task.dueOn !== null && task.dueOn <= today,
  ).length;

  return { done, total: done + pending };
}

function wasCompletedOn(task: MedicationProgressTask, day: CalendarDate): boolean {
  if (task.completedAt === null) return false;
  return todayInSaoPaulo(new Date(task.completedAt)) === day;
}
