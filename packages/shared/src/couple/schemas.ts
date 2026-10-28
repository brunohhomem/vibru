import { z } from '../zod';
import { parseCalendarDate } from './calendar-date';

export const calendarDateSchema = z.string().refine(
  (value) => {
    try {
      parseCalendarDate(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Data inválida. Use o formato YYYY-MM-DD' },
);

export const memberColorSchema = z.enum(['blue', 'purple']);

export const coupleMemberSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  color: memberColorSchema,
  isMe: z.boolean(),
});

const elapsedPeriodSchema = z.object({
  years: z.number().int().nonnegative(),
  months: z.number().int().nonnegative(),
  days: z.number().int().nonnegative(),
  totalDays: z.number().int().nonnegative(),
});

const weddingAnniversarySchema = z.object({
  date: calendarDateSchema,
  years: z.number().int().nonnegative(),
  bodasName: z.string().nullable(),
  daysUntil: z.number().int().nonnegative(),
});

const datingAnniversarySchema = z.object({
  date: calendarDateSchema,
  years: z.number().int().nonnegative(),
  daysUntil: z.number().int().nonnegative(),
});

export const coupleResponseSchema = z.object({
  id: z.string().uuid(),
  datingStartedOn: calendarDateSchema.nullable(),
  marriedOn: calendarDateSchema.nullable(),
  today: calendarDateSchema,
  members: z.array(coupleMemberSchema),
  married: elapsedPeriodSchema.nullable(),
  nextWeddingAnniversary: weddingAnniversarySchema.nullable(),
  nextDatingAnniversary: datingAnniversarySchema.nullable(),
});

export const updateCoupleRequestSchema = z
  .object({
    datingStartedOn: calendarDateSchema.nullable().optional(),
    marriedOn: calendarDateSchema.nullable().optional(),
  })
  .refine((data) => data.datingStartedOn !== undefined || data.marriedOn !== undefined, {
    message: 'Informe ao menos uma data',
  });

export const updateMyMemberRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Informe seu nome' })
    .max(40, { message: 'Use até 40 caracteres' }),
});

export const COUPLE_ERROR_CODES = {
  COUPLE_REQUIRED: 'COUPLE_REQUIRED',
  COUPLE_DATES_INVALID: 'COUPLE_DATES_INVALID',
} as const;

export type CalendarDateSchema = z.infer<typeof calendarDateSchema>;
export type MemberColor = z.infer<typeof memberColorSchema>;
export type CoupleMember = z.infer<typeof coupleMemberSchema>;
export type CoupleResponse = z.infer<typeof coupleResponseSchema>;
export type UpdateCoupleRequest = z.infer<typeof updateCoupleRequestSchema>;
export type UpdateMyMemberRequest = z.infer<typeof updateMyMemberRequestSchema>;
export type CoupleErrorCode = (typeof COUPLE_ERROR_CODES)[keyof typeof COUPLE_ERROR_CODES];
