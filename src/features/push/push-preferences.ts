import { z } from 'zod';

/** Os avisos que a pessoa pode ligar ou desligar. Cada nome é também a coluna no banco. */
export const PUSH_KINDS = [
  'taskAssigned',
  'taskCompleted',
  'dailySummary',
  'tomorrowPreview',
  'lowStock',
] as const;

export type PushKind = (typeof PUSH_KINDS)[number];
export type NotificationPreferences = Record<PushKind, boolean>;

// Os mesmos padrões das colunas da tabela: quem nunca mexeu recebe isto.
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  taskAssigned: true,
  taskCompleted: true,
  dailySummary: true,
  tomorrowPreview: true,
  lowStock: false,
};

/** Sem linha salva, valem os padrões. */
export function resolvePreferences(
  stored: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  // Só os campos de preferência: a linha do banco traz também `userId` e `updatedAt`.
  return {
    taskAssigned: stored?.taskAssigned ?? DEFAULT_PREFERENCES.taskAssigned,
    taskCompleted: stored?.taskCompleted ?? DEFAULT_PREFERENCES.taskCompleted,
    dailySummary: stored?.dailySummary ?? DEFAULT_PREFERENCES.dailySummary,
    tomorrowPreview: stored?.tomorrowPreview ?? DEFAULT_PREFERENCES.tomorrowPreview,
    lowStock: stored?.lowStock ?? DEFAULT_PREFERENCES.lowStock,
  };
}

export function isPushKindEnabled(
  stored: Partial<NotificationPreferences> | null,
  kind: PushKind,
): boolean {
  return resolvePreferences(stored)[kind];
}

export const updatePreferencesSchema = z
  .object({
    taskAssigned: z.boolean(),
    taskCompleted: z.boolean(),
    dailySummary: z.boolean(),
    tomorrowPreview: z.boolean(),
    lowStock: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Informe ao menos uma preferência.',
  });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
