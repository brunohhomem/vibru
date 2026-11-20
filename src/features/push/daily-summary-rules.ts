type SummaryTask = {
  title: string;
  dueOn: string | null;
  assigneeMemberId: string | null;
  medicationId: string | null;
};

/**
 * Tarefas de hoje que cabem a esta pessoa: as dela e as sem responsável ("nós").
 * Tarefa de remédio fica de fora: é dado de saúde e o resumo aparece na tela de bloqueio.
 */
export function selectTaskTitlesDueToday(
  tasks: SummaryTask[],
  memberId: string,
  today: string,
): string[] {
  return tasks
    .filter((task) => task.dueOn === today)
    .filter((task) => task.medicationId === null)
    .filter((task) => task.assigneeMemberId === null || task.assigneeMemberId === memberId)
    .map((task) => task.title);
}

/** Atravessa o resumo sem repetir o mesmo aviso quando duas inscrições são do mesmo membro. */
export function groupByMember<T extends { memberId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.memberId) ?? [];
    group.push(item);
    groups.set(item.memberId, group);
  }
  return groups;
}
