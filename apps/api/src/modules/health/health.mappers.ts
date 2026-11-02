import type {
  Allergy,
  Doctor,
  EmergencyContact,
  HealthCondition,
  HealthProfile,
} from '@vibru/shared';
import type { HealthProfileRow } from './health-profile.entity';
import type {
  AllergyRow,
  DoctorRow,
  EmergencyContactRow,
  HealthConditionRow,
} from './health-records.entity';

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
