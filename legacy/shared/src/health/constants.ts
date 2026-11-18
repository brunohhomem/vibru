export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe'] as const;

export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export const HEALTH_EVENT_KINDS = [
  'appointment',
  'exam',
  'vaccine',
  'surgery',
  'hospitalization',
] as const;

export type HealthEventKind = (typeof HEALTH_EVENT_KINDS)[number];

export const MAX_MEDICATION_TIMES = 6;

export const DEFAULT_LOW_STOCK_DAYS = 7;

export const HEALTH_ERROR_CODES = {
  HEALTH_MEMBER_NOT_FOUND: 'HEALTH_MEMBER_NOT_FOUND',
  HEALTH_ITEM_NOT_FOUND: 'HEALTH_ITEM_NOT_FOUND',
  MEDICATION_NOT_FOUND: 'MEDICATION_NOT_FOUND',
} as const;

export type HealthErrorCode = (typeof HEALTH_ERROR_CODES)[keyof typeof HEALTH_ERROR_CODES];
