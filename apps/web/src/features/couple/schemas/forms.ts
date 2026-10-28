import { z } from '@vibru/shared/zod';

export const coupleFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Informe seu nome' })
    .max(40, { message: 'Use até 40 caracteres' }),
  datingStartedOn: z.string(),
  marriedOn: z.string(),
});

export type CoupleFormValues = z.infer<typeof coupleFormSchema>;
