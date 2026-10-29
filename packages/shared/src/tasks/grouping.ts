import type { CalendarDate } from '../couple/calendar-date';
import { addCalendarDays, startOfWeek } from './recurrence';

export type TaskGroupable = {
  dueOn: CalendarDate | null;
  createdAt: string;
};

export type TaskGroups<T extends TaskGroupable> = {
  overdue: T[];
  today: T[];
  thisWeek: T[];
  later: T[];
  noDueDate: T[];
};

/**
 * Agrupa tarefas abertas em Atrasadas → Hoje → Esta semana → Mais pra frente →
 * Sem prazo. Dentro do grupo vale o prazo e, no empate, a criação (regra 3.8).
 */
export function groupTasks<T extends TaskGroupable>(
  tasks: readonly T[],
  today: CalendarDate,
): TaskGroups<T> {
  const weekEnd = addCalendarDays(startOfWeek(today), 6);
  const groups: TaskGroups<T> = {
    overdue: [],
    today: [],
    thisWeek: [],
    later: [],
    noDueDate: [],
  };

  for (const task of tasks) {
    if (task.dueOn === null) {
      groups.noDueDate.push(task);
      continue;
    }

    if (task.dueOn < today) {
      groups.overdue.push(task);
      continue;
    }

    if (task.dueOn === today) {
      groups.today.push(task);
      continue;
    }

    if (task.dueOn <= weekEnd) {
      groups.thisWeek.push(task);
      continue;
    }

    groups.later.push(task);
  }

  groups.overdue.sort(byDueDate);
  groups.today.sort(byDueDate);
  groups.thisWeek.sort(byDueDate);
  groups.later.sort(byDueDate);
  groups.noDueDate.sort(byCreation);

  return groups;
}

function byDueDate(first: TaskGroupable, second: TaskGroupable): number {
  const dueComparison = (first.dueOn ?? '').localeCompare(second.dueOn ?? '');
  if (dueComparison !== 0) return dueComparison;
  return byCreation(first, second);
}

function byCreation(first: TaskGroupable, second: TaskGroupable): number {
  return first.createdAt.localeCompare(second.createdAt);
}
