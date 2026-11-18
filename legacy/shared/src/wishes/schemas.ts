import { z } from '../zod';
import { calendarDateSchema } from '../couple/schemas';
import { taskDueTimeSchema } from '../tasks/schemas';
import { WISH_CATEGORIES, WISH_STATUSES } from './constants';

function hasAtLeastOneField(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => value !== undefined);
}

/**
 * Link que o navegador abre ou carrega como imagem. Só `http` e `https`:
 * `javascript:` ou `data:` virariam script ou conteúdo arbitrário na tela.
 */
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2000, { message: 'Use até 2000 caracteres' })
  .url({ message: 'Link inválido' })
  .refine((value) => /^https?:\/\//i.test(value), { message: 'Use um link http ou https' });

export const priceCentsSchema = z
  .number()
  .int({ message: 'Use um valor em centavos' })
  .min(0, { message: 'O valor não pode ser negativo' })
  .max(100_000_000, { message: 'Valor alto demais' });

export const wishCategorySchema = z.enum(WISH_CATEGORIES, { message: 'Categoria inválida' });
export const wishStatusSchema = z.enum(WISH_STATUSES).default('open');

const wishFields = {
  title: z
    .string()
    .trim()
    .min(1, { message: 'Informe o título' })
    .max(120, { message: 'Use até 120 caracteres' }),
  category: wishCategorySchema,
  url: httpUrlSchema.nullable().optional(),
  imageUrl: httpUrlSchema.nullable().optional(),
  priceCents: priceCentsSchema.nullable().optional(),
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }).nullable().optional(),
};

export const createWishRequestSchema = z.object(wishFields);
export const updateWishRequestSchema = z
  .object(wishFields)
  .partial()
  .refine(hasAtLeastOneField, { message: 'Informe ao menos um campo' });

export const planWishRequestSchema = z.object({
  startsOn: calendarDateSchema,
  startTime: taskDueTimeSchema.nullable().optional(),
});

export const wishSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  category: wishCategorySchema,
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  notes: z.string().nullable(),
  doneAt: z.string().nullable(),
  plannedOn: calendarDateSchema.nullable(),
  createdAt: z.string(),
});

export const wishesResponseSchema = z.object({ wishes: z.array(wishSchema) });

export type Wish = z.infer<typeof wishSchema>;
export type WishesResponse = z.infer<typeof wishesResponseSchema>;
export type CreateWishRequest = z.infer<typeof createWishRequestSchema>;
export type UpdateWishRequest = z.infer<typeof updateWishRequestSchema>;
export type PlanWishRequest = z.infer<typeof planWishRequestSchema>;
