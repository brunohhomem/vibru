import { GIFT_CATEGORIES } from '@vibru/shared';
import { z } from '@vibru/shared/zod';
import { optionalHttpUrl, optionalPrice } from '@/features/wishes/schemas/forms';

export const giftFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Informe o título' })
    .max(120, { message: 'Use até 120 caracteres' }),
  category: z.enum(GIFT_CATEGORIES),
  url: optionalHttpUrl,
  imageUrl: optionalHttpUrl,
  price: optionalPrice,
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }),
});

export type GiftFormValues = z.infer<typeof giftFormSchema>;
