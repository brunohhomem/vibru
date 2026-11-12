import { z } from '../zod';
import { httpUrlSchema, priceCentsSchema } from '../wishes/schemas';
import { GIFT_CATEGORIES, GIFT_STATUSES } from './constants';

function hasAtLeastOneField(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => value !== undefined);
}

export const giftCategorySchema = z.enum(GIFT_CATEGORIES, { message: 'Categoria inválida' });
export const giftStatusSchema = z.enum(GIFT_STATUSES).default('wanted');

const giftFields = {
  title: z
    .string()
    .trim()
    .min(1, { message: 'Informe o título' })
    .max(120, { message: 'Use até 120 caracteres' }),
  category: giftCategorySchema,
  url: httpUrlSchema.nullable().optional(),
  imageUrl: httpUrlSchema.nullable().optional(),
  priceCents: priceCentsSchema.nullable().optional(),
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }).nullable().optional(),
};

export const createGiftRequestSchema = z.object(giftFields);
export const updateGiftRequestSchema = z
  .object(giftFields)
  .partial()
  .refine(hasAtLeastOneField, { message: 'Informe ao menos um campo' });

/** O que o dono vê: nunca os campos de reserva (ADR 0003, 3.10). */
export const giftForOwnerSchema = z.object({
  id: z.string().uuid(),
  ownerMemberId: z.string().uuid(),
  title: z.string(),
  category: giftCategorySchema,
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  notes: z.string().nullable(),
  receivedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const giftForPartnerSchema = giftForOwnerSchema.extend({
  reservedByMemberId: z.string().uuid().nullable(),
  reservedAt: z.string().nullable(),
});

export const giftResponseSchema = z.union([giftForPartnerSchema, giftForOwnerSchema]);
export const giftsResponseSchema = z.object({ gifts: z.array(giftResponseSchema) });

export type GiftForOwner = z.infer<typeof giftForOwnerSchema>;
export type GiftForPartner = z.infer<typeof giftForPartnerSchema>;
export type GiftResponse = GiftForOwner | GiftForPartner;
export type GiftsResponse = z.infer<typeof giftsResponseSchema>;
export type CreateGiftRequest = z.infer<typeof createGiftRequestSchema>;
export type UpdateGiftRequest = z.infer<typeof updateGiftRequestSchema>;
