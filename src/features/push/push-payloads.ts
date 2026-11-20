export type PushPayload = {
  title: string;
  body: string;
  /** Rota aberta ao tocar na notificação. */
  url: string;
  /** Mesma etiqueta substitui a notificação anterior em vez de empilhar. */
  tag: string;
};

export function taskAssignedPayload(assignerName: string, taskTitle: string): PushPayload {
  return {
    title: 'Nova tarefa para você',
    body: `${assignerName}: ${taskTitle}`,
    url: '/app/tasks',
    tag: 'task-assigned',
  };
}

export function taskCompletedPayload(completerName: string, taskTitle: string): PushPayload {
  return {
    title: `${completerName} concluiu uma tarefa`,
    body: taskTitle,
    url: '/app/tasks',
    tag: 'task-completed',
  };
}

export type DailySummaryInput = {
  taskTitles: string[];
  eventTitles: string[];
  importantDateTitles: string[];
};

const MAX_TITLES_PER_SECTION = 3;

function section(label: string, titles: string[]): string | null {
  if (titles.length === 0) return null;

  const shown = titles.slice(0, MAX_TITLES_PER_SECTION).join(', ');
  const hidden = titles.length - MAX_TITLES_PER_SECTION;
  return hidden > 0 ? `${label}: ${shown} e mais ${hidden}` : `${label}: ${shown}`;
}

/** Sem nada para hoje não há o que avisar: devolve nulo e ninguém recebe notificação vazia. */
export function dailySummaryPayload(input: DailySummaryInput): PushPayload | null {
  const sections = [
    section('Tarefas', input.taskTitles),
    section('Eventos', input.eventTitles),
    section('Datas', input.importantDateTitles),
  ].filter((value): value is string => value !== null);
  if (sections.length === 0) return null;

  return {
    title: 'Hoje no Vibru',
    body: sections.join('\n'),
    url: '/app',
    tag: 'daily-summary',
  };
}
