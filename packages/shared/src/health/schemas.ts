import { z } from '../zod';
import { phoneSchema } from '../auth/schemas';
import { calendarDateSchema } from '../couple/schemas';
import { taskDueTimeSchema } from '../tasks/schemas';
import {
  ALLERGY_SEVERITIES,
  BLOOD_TYPES,
  DEFAULT_LOW_STOCK_DAYS,
  MAX_MEDICATION_TIMES,
} from './constants';

function limitMessage(max: number) {
  return { message: `Use até ${max} caracteres` };
}

function requiredText(max: number, requiredMessage: string) {
  return z.string().trim().min(1, { message: requiredMessage }).max(max, limitMessage(max));
}

function optionalText(max: number) {
  return z.string().trim().max(max, limitMessage(max)).nullable().optional();
}

function hasAtLeastOneField(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => value !== undefined);
}

const AT_LEAST_ONE_FIELD = { message: 'Informe ao menos um campo' };

export const bloodTypeSchema = z.enum(BLOOD_TYPES, { message: 'Tipo sanguíneo inválido' });
export const allergySeveritySchema = z.enum(ALLERGY_SEVERITIES, {
  message: 'Gravidade inválida',
});

export const healthProfileSchema = z.object({
  bloodType: bloodTypeSchema,
  organDonor: z.boolean().nullable(),
  healthPlanName: z.string().nullable(),
  healthPlanNumber: z.string().nullable(),
  preferredHospital: z.string().nullable(),
  notes: z.string().nullable(),
});

export const updateHealthProfileRequestSchema = z.object({
  bloodType: bloodTypeSchema.default('unknown'),
  organDonor: z.boolean().nullable().optional(),
  healthPlanName: optionalText(100),
  healthPlanNumber: optionalText(60),
  preferredHospital: optionalText(120),
  notes: optionalText(1000),
});

const allergyFields = {
  substance: requiredText(100, 'Informe a substância'),
  reaction: optionalText(200),
  severity: allergySeveritySchema,
};

export const createAllergyRequestSchema = z.object(allergyFields);
export const updateAllergyRequestSchema = z
  .object(allergyFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const allergySchema = z.object({
  id: z.string().uuid(),
  substance: z.string(),
  reaction: z.string().nullable(),
  severity: allergySeveritySchema,
  createdAt: z.string(),
});

const conditionFields = {
  name: requiredText(100, 'Informe a condição'),
  sinceOn: calendarDateSchema.nullable().optional(),
  notes: optionalText(500),
};

export const createHealthConditionRequestSchema = z.object(conditionFields);
export const updateHealthConditionRequestSchema = z
  .object(conditionFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const healthConditionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sinceOn: calendarDateSchema.nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const contactFields = {
  name: requiredText(100, 'Informe o nome'),
  relationship: requiredText(60, 'Informe o parentesco'),
  phone: phoneSchema,
};

export const createEmergencyContactRequestSchema = z.object(contactFields);
export const updateEmergencyContactRequestSchema = z
  .object(contactFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const emergencyContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  createdAt: z.string(),
});

const doctorFields = {
  name: requiredText(100, 'Informe o nome'),
  specialty: optionalText(60),
  phone: phoneSchema.nullable().optional(),
  notes: optionalText(500),
};

export const createDoctorRequestSchema = z.object(doctorFields);
export const updateDoctorRequestSchema = z
  .object(doctorFields)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const doctorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  specialty: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const medicationTimesSchema = z
  .array(taskDueTimeSchema)
  .max(MAX_MEDICATION_TIMES, { message: `Use até ${MAX_MEDICATION_TIMES} horários` })
  .refine((times) => new Set(times).size === times.length, {
    message: 'Os horários não podem se repetir',
  });

const medicationNameSchema = requiredText(80, 'Informe o nome do remédio');
const medicationDosageSchema = z.string().trim().max(40, limitMessage(40));
const medicationInstructionsSchema = z.string().trim().max(200, limitMessage(200));
const medicationStockSchema = z.number().int().min(0, { message: 'Use 0 ou mais' }).nullable();
const medicationUnitsPerDoseSchema = z
  .number()
  .int()
  .min(1, { message: 'Use 1 ou mais' })
  .max(100, { message: 'Use até 100' });
const medicationLowStockDaysSchema = z
  .number()
  .int()
  .min(1, { message: 'Use 1 ou mais' })
  .max(60, { message: 'Use até 60' });

export const createMedicationRequestSchema = z.object({
  name: medicationNameSchema,
  dosage: medicationDosageSchema.default(''),
  instructions: medicationInstructionsSchema.default(''),
  times: medicationTimesSchema.default([]),
  isContinuous: z.boolean().default(true),
  stockUnits: medicationStockSchema.default(null),
  unitsPerDose: medicationUnitsPerDoseSchema.default(1),
  lowStockDays: medicationLowStockDaysSchema.default(DEFAULT_LOW_STOCK_DAYS),
});

export const updateMedicationRequestSchema = z
  .object({
    name: medicationNameSchema,
    dosage: medicationDosageSchema,
    instructions: medicationInstructionsSchema,
    times: medicationTimesSchema,
    isContinuous: z.boolean(),
    stockUnits: medicationStockSchema,
    unitsPerDose: medicationUnitsPerDoseSchema,
    lowStockDays: medicationLowStockDaysSchema,
  })
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE_FIELD);

export const medicationSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  name: z.string(),
  dosage: z.string(),
  instructions: z.string(),
  times: z.array(taskDueTimeSchema),
  isContinuous: z.boolean(),
  stockUnits: z.number().int().nullable(),
  unitsPerDose: z.number().int(),
  lowStockDays: z.number().int(),
  createdAt: z.string(),
});

export const healthRecordSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
  profile: healthProfileSchema,
  allergies: z.array(allergySchema),
  conditions: z.array(healthConditionSchema),
  contacts: z.array(emergencyContactSchema),
  doctors: z.array(doctorSchema),
  medications: z.array(medicationSchema),
});

export const healthMembersResponseSchema = z.object({
  members: z.array(
    z.object({
      memberId: z.string().uuid(),
      name: z.string(),
      medicationCount: z.number().int().nonnegative(),
    }),
  ),
});

export const pharmacyResultSchema = z.object({
  list: z.object({ id: z.string().uuid(), title: z.string() }),
  item: z.object({ id: z.string().uuid(), title: z.string() }),
  alreadyListed: z.boolean(),
});

export type HealthProfile = z.infer<typeof healthProfileSchema>;
export type UpdateHealthProfileRequest = z.infer<typeof updateHealthProfileRequestSchema>;
export type Allergy = z.infer<typeof allergySchema>;
export type CreateAllergyRequest = z.infer<typeof createAllergyRequestSchema>;
export type UpdateAllergyRequest = z.infer<typeof updateAllergyRequestSchema>;
export type HealthCondition = z.infer<typeof healthConditionSchema>;
export type CreateHealthConditionRequest = z.infer<typeof createHealthConditionRequestSchema>;
export type UpdateHealthConditionRequest = z.infer<typeof updateHealthConditionRequestSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type CreateEmergencyContactRequest = z.infer<typeof createEmergencyContactRequestSchema>;
export type UpdateEmergencyContactRequest = z.infer<typeof updateEmergencyContactRequestSchema>;
export type Doctor = z.infer<typeof doctorSchema>;
export type CreateDoctorRequest = z.infer<typeof createDoctorRequestSchema>;
export type UpdateDoctorRequest = z.infer<typeof updateDoctorRequestSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type CreateMedicationRequest = z.infer<typeof createMedicationRequestSchema>;
export type UpdateMedicationRequest = z.infer<typeof updateMedicationRequestSchema>;
export type HealthRecord = z.infer<typeof healthRecordSchema>;
export type HealthMembersResponse = z.infer<typeof healthMembersResponseSchema>;
export type PharmacyResult = z.infer<typeof pharmacyResultSchema>;
