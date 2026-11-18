import {
  daysBetween,
  parseCalendarDate,
  type CalendarDate,
  type TaskRecurrenceKind,
} from '@vibru/shared';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

export const RECURRENCE_OPTIONS: { value: TaskRecurrenceKind; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
];

/** Prazo curto no formato "hoje", "amanhã" ou "sáb, 14 nov". */
export function dueLabel(dueOn: CalendarDate | null, today: CalendarDate): string {
  if (dueOn === null) return 'Sem prazo';

  const difference = daysBetween(today, dueOn);
  if (difference === 0) return 'hoje';
  if (difference === 1) return 'amanhã';
  if (difference === -1) return 'ontem';

  const { year, month, day } = parseCalendarDate(dueOn);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `${weekday}, ${day} ${MONTHS[month - 1]}`;
}

export function isOverdue(dueOn: CalendarDate | null, today: CalendarDate): boolean {
  return dueOn !== null && dueOn < today;
}

export function tasksTodayLabel(count: number): string {
  if (count === 0) return 'nenhuma tarefa hoje';
  if (count === 1) return '1 tarefa hoje';
  return `${count} tarefas hoje`;
}
