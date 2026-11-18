import type {
  AllergyRow,
  DoctorRow,
  EmergencyContactRow,
  HealthConditionRow,
  HealthEventRow,
  HealthProfileRow,
} from '@/db/health-schema';
import type { MedicationRow } from '@/db/medications-schema';
import type {
  Allergy,
  Doctor,
  EmergencyContact,
  HealthCondition,
  HealthEvent,
  HealthProfile,
  Medication,
} from './health-schemas';

export function emptyProfile(): HealthProfile {
  return {
    bloodType: 'unknown',
    organDonor: null,
    healthPlanName: null,
    healthPlanNumber: null,
    preferredHospital: null,
    notes: null,
  };
}

/** Texto vazio, nulo e ausente são a mesma coisa na ficha: nulo. */
export function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value === '' ? null : value;
}

export function toHealthProfile(row: HealthProfileRow): HealthProfile {
  return {
    bloodType: row.bloodType,
    organDonor: row.organDonor,
    healthPlanName: row.healthPlanName,
    healthPlanNumber: row.healthPlanNumber,
    preferredHospital: row.preferredHospital,
    notes: row.notes,
  };
}

export function toAllergy(row: AllergyRow): Allergy {
  return {
    id: row.id,
    substance: row.substance,
    reaction: row.reaction,
    severity: row.severity,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toHealthCondition(row: HealthConditionRow): HealthCondition {
  return {
    id: row.id,
    name: row.name,
    sinceOn: row.sinceOn,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toEmergencyContact(row: EmergencyContactRow): EmergencyContact {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toHealthEvent(row: HealthEventRow): HealthEvent {
  return {
    id: row.id,
    kind: row.kind,
    occurredOn: row.occurredOn,
    title: row.title,
    doctorId: row.doctorId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toDoctor(row: DoctorRow): Doctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Nunca expõe `low_stock_prompted_at`: é controle interno da pergunta da Farmácia. */
export function toMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    memberId: row.memberId,
    name: row.name,
    dosage: row.dosage,
    instructions: row.instructions,
    times: row.times,
    isContinuous: row.isContinuous,
    stockUnits: row.stockUnits,
    unitsPerDose: row.unitsPerDose,
    lowStockDays: row.lowStockDays,
    createdAt: row.createdAt.toISOString(),
  };
}
