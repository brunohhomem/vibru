import { z } from '@vibru/shared/zod';

const title = z
  .string()
  .trim()
  .min(1, { message: 'Informe o título' })
  .max(120, { message: 'Use até 120 caracteres' });

const requiredDate = z.string().min(1, { message: 'Informe a data' });

export const eventFormSchema = z.object({
  title,
  startsOn: requiredDate,
  startTime: z.string(),
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }),
});

export const importantDateFormSchema = z.object({
  title,
  occursOn: requiredDate,
  repeatsYearly: z.boolean(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;
export type ImportantDateFormValues = z.infer<typeof importantDateFormSchema>;
