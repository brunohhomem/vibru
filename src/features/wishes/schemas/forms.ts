import { WISH_CATEGORIES } from '@vibru/shared';
import { z } from '@vibru/shared/zod';
import { parseReaisToCents } from '@/lib/money';

/** Link vazio é aceito (campo opcional); preenchido, só `http` e `https`. */
export const optionalHttpUrl = z
  .string()
  .trim()
  .max(2000, { message: 'Use até 2000 caracteres' })
  .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), {
    message: 'Use um link http ou https',
  });

/** Preço digitado em reais; vazio significa "sem preço". */
export const optionalPrice = z
  .string()
  .refine((value) => value.trim() === '' || parseReaisToCents(value) !== null, {
    message: 'Use um valor como 129,90',
  });

export const wishFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Informe o título' })
    .max(120, { message: 'Use até 120 caracteres' }),
  category: z.enum(WISH_CATEGORIES),
  url: optionalHttpUrl,
  imageUrl: optionalHttpUrl,
  price: optionalPrice,
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }),
});

export const planWishFormSchema = z.object({
  startsOn: z.string().min(1, { message: 'Informe o dia' }),
  startTime: z.string(),
});

export type WishFormValues = z.infer<typeof wishFormSchema>;
export type PlanWishFormValues = z.infer<typeof planWishFormSchema>;
