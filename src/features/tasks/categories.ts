export const TASK_CATEGORIES = ['home', 'health', 'shopping', 'bills', 'other'] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  home: 'Casa',
  health: 'Saúde',
  shopping: 'Compras',
  bills: 'Contas',
  other: 'Outros',
};

export const DEFAULT_TASK_CATEGORY: TaskCategory = 'other';
