import { z } from '@vibru/shared/zod';
import {
  ALLERGY_SEVERITIES,
  BLOOD_TYPES,
  HEALTH_EVENT_KINDS,
  MAX_MEDICATION_TIMES,
} from '@vibru/shared';

const ORGAN_DONOR_VALUES = ['unknown', 'yes', 'no'] as const;

function limited(max: number) {
  return z
    .string()
    .trim()
    .max(max, { message: `Use até ${max} caracteres` });
}

function required(max: number, message: string) {
  return z
    .string()
    .trim()
    .min(1, { message })
    .max(max, { message: `Use até ${max} caracteres` });
}

function isPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

const requiredPhone = z.string().refine(isPhoneNumber, { message: 'Telefone inválido' });
const optionalPhone = z
  .string()
  .refine((value) => value.trim() === '' || isPhoneNumber(value), { message: 'Telefone inválido' });

export const healthProfileFormSchema = z.object({
  bloodType: z.enum(BLOOD_TYPES),
  organDonor: z.enum(ORGAN_DONOR_VALUES),
  healthPlanName: limited(100),
  healthPlanNumber: limited(60),
  preferredHospital: limited(120),
  notes: limited(1000),
});

export const allergyFormSchema = z.object({
  substance: required(100, 'Informe a substância'),
  reaction: limited(200),
  severity: z.enum(ALLERGY_SEVERITIES),
});

export const conditionFormSchema = z.object({
  name: required(100, 'Informe a condição'),
  sinceOn: z.string(),
  notes: limited(500),
});

export const contactFormSchema = z.object({
  name: required(100, 'Informe o nome'),
  relationship: required(60, 'Informe o parentesco'),
  phone: requiredPhone,
});

export const doctorFormSchema = z.object({
  name: required(100, 'Informe o nome'),
  specialty: limited(60),
  phone: optionalPhone,
  notes: limited(500),
});

export const healthEventFormSchema = z.object({
  kind: z.enum(HEALTH_EVENT_KINDS),
  occurredOn: z.string().min(1, { message: 'Informe a data' }),
  title: required(120, 'Informe o título'),
  doctorId: z.string(),
  notes: limited(1000),
});

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function wholeNumber(min: number, max: number) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, { message: 'Use um número inteiro' })
    .refine((value) => Number(value) >= min && Number(value) <= max, {
      message: `Use de ${min} a ${max}`,
    });
}

export const medicationFormSchema = z
  .object({
    name: required(80, 'Informe o nome do remédio'),
    dosage: limited(40),
    instructions: limited(200),
    times: z
      .array(z.string().regex(TIME_PATTERN, { message: 'Use o formato HH:MM' }))
      .max(MAX_MEDICATION_TIMES, { message: `Use até ${MAX_MEDICATION_TIMES} horários` }),
    isContinuous: z.boolean(),
    controlStock: z.boolean(),
    stockUnits: z.string(),
    unitsPerDose: wholeNumber(1, 100),
    lowStockDays: wholeNumber(1, 60),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.times).size !== data.times.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['times'],
        message: 'Os horários não podem se repetir',
      });
    }

    if (data.controlStock && !/^\d+$/.test(data.stockUnits.trim())) {
      ctx.addIssue({
        code: 'custom',
        path: ['stockUnits'],
        message: 'Informe quantas unidades tem',
      });
    }
  });

export type HealthProfileFormValues = z.infer<typeof healthProfileFormSchema>;
export type AllergyFormValues = z.infer<typeof allergyFormSchema>;
export type ConditionFormValues = z.infer<typeof conditionFormSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
export type HealthEventFormValues = z.infer<typeof healthEventFormSchema>;
export type MedicationFormValues = z.infer<typeof medicationFormSchema>;
