import { z } from '../zod';
import { calendarDateSchema } from '../couple/schemas';
import { taskDueTimeSchema } from '../tasks/schemas';

export const AGENDA_ERROR_CODES = {
  AGENDA_ITEM_NOT_FOUND: 'AGENDA_ITEM_NOT_FOUND',
  ICS_FEED_NOT_FOUND: 'ICS_FEED_NOT_FOUND',
} as const;

function hasAtLeastOneField(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => value !== undefined);
}

const AT_LEAST_ONE_FIELD = { message: 'Informe ao menos um campo' };

const titleSchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe o título' })
  .max(120, { message: 'Use até 120 caracteres' });

export const agendaMonthSchema = z
  .string({ message: 'Informe o mês' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Use o formato YYYY-MM' });

const eventFields = {
  title: titleSchema,
  startsOn: calendarDateSchema,
  startTime: taskDueTimeSchema.nullable().optional(),
  notes: z.string().trim().max(500, { message: 'Use até 500 caracteres' }).nullable().optional(),
};

export const createAgendaEventRequestSchema = z.object(eventFields);
export const updateAgendaEventRequestSchema = z
  .object(eventFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const agendaEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startsOn: calendarDateSchema,
  startTime: taskDueTimeSchema.nullable(),
  notes: z.string().nullable(),
  wishId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

const importantDateFields = {
  title: titleSchema,
  occursOn: calendarDateSchema,
  repeatsYearly: z.boolean(),
};

export const createImportantDateRequestSchema = z.object(importantDateFields);
export const updateImportantDateRequestSchema = z
  .object(importantDateFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const importantDateSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  occursOn: calendarDateSchema,
  repeatsYearly: z.boolean(),
  createdAt: z.string(),
});

/** `occursOn` é a data cadastrada; `date` é a ocorrência dentro do mês consultado. */
export const importantDateOccurrenceSchema = importantDateSchema.extend({
  date: calendarDateSchema,
});

export const agendaAnniversarySchema = z.object({
  kind: z.enum(['wedding', 'dating']),
  date: calendarDateSchema,
  years: z.number().int().positive(),
  title: z.string(),
});

export const agendaResponseSchema = z.object({
  month: agendaMonthSchema,
  today: calendarDateSchema,
  events: z.array(agendaEventSchema),
  importantDates: z.array(importantDateOccurrenceSchema),
  anniversaries: z.array(agendaAnniversarySchema),
});

export const icsFeedStatusSchema = z.object({ active: z.boolean() });

/** O caminho só existe nesta resposta: o banco guarda apenas o hash do token. */
export const icsFeedCreatedSchema = z.object({ feedPath: z.string() });

export type AgendaEvent = z.infer<typeof agendaEventSchema>;
export type CreateAgendaEventRequest = z.infer<typeof createAgendaEventRequestSchema>;
export type UpdateAgendaEventRequest = z.infer<typeof updateAgendaEventRequestSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type ImportantDateOccurrence = z.infer<typeof importantDateOccurrenceSchema>;
export type CreateImportantDateRequest = z.infer<typeof createImportantDateRequestSchema>;
export type UpdateImportantDateRequest = z.infer<typeof updateImportantDateRequestSchema>;
export type AgendaAnniversary = z.infer<typeof agendaAnniversarySchema>;
export type AgendaResponse = z.infer<typeof agendaResponseSchema>;
export type IcsFeedStatus = z.infer<typeof icsFeedStatusSchema>;
export type IcsFeedCreated = z.infer<typeof icsFeedCreatedSchema>;
