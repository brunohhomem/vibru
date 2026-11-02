import { z } from '@vibru/shared/zod';
import { TASK_CATEGORIES, TASK_RECURRENCE_KINDS } from '@vibru/shared';

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Informe o título' })
      .max(200, { message: 'Use até 200 caracteres' }),
    assignee: z.string(),
    category: z.enum(TASK_CATEGORIES),
    dueOn: z.string(),
    dueTime: z.string(),
    recurrenceKind: z.enum(TASK_RECURRENCE_KINDS),
    interval: z
      .string()
      .trim()
      .regex(/^\d+$/, { message: 'Use um número inteiro' })
      .refine((value) => Number(value) >= 1 && Number(value) <= 365, {
        message: 'Use de 1 a 365',
      }),
    notes: z.string().max(2000, { message: 'Use até 2000 caracteres' }),
  })
  .superRefine((data, ctx) => {
    if (data.dueTime && !data.dueOn) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueTime'],
        message: 'Informe o prazo para usar um horário',
      });
    }

    if (data.recurrenceKind === 'none' || data.dueOn) return;

    ctx.addIssue({
      code: 'custom',
      path: ['dueOn'],
      message: 'Tarefa recorrente precisa de prazo',
    });
  });

export const taskNotesFormSchema = z.object({
  notes: z.string().max(2000, { message: 'Use até 2000 caracteres' }),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type TaskNotesFormValues = z.infer<typeof taskNotesFormSchema>;
