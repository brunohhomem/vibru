import { describe, expect, it } from 'vitest';
import type {
  AllergyRow,
  DoctorRow,
  EmergencyContactRow,
  HealthConditionRow,
  HealthEventRow,
  HealthProfileRow,
} from '@/db/health-schema';
import type { MedicationRow } from '@/db/medications-schema';
import {
  emptyProfile,
  emptyToNull,
  toAllergy,
  toDoctor,
  toEmergencyContact,
  toHealthCondition,
  toHealthEvent,
  toHealthProfile,
  toMedication,
} from './health-mappers';

const base = {
  id: 'id-1',
  isActive: true,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  coupleId: 'couple-1',
  memberId: 'member-1',
};

describe('emptyToNull', () => {
  it('vazio, nulo e ausente viram nulo; texto fica', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull('Plano X')).toBe('Plano X');
  });
});

describe('perfil de saúde', () => {
  it('a ficha vazia tem tipo sanguíneo desconhecido e o resto nulo', () => {
    expect(emptyProfile()).toEqual({
      bloodType: 'unknown',
      organDonor: null,
      healthPlanName: null,
      healthPlanNumber: null,
      preferredHospital: null,
      notes: null,
    });
  });

  it('toHealthProfile devolve só os campos da ficha', () => {
    const row: HealthProfileRow = {
      ...base,
      bloodType: 'O+',
      organDonor: true,
      healthPlanName: 'Plano',
      healthPlanNumber: '123',
      preferredHospital: 'Hospital',
      notes: 'obs',
    };

    expect(toHealthProfile(row)).toEqual({
      bloodType: 'O+',
      organDonor: true,
      healthPlanName: 'Plano',
      healthPlanNumber: '123',
      preferredHospital: 'Hospital',
      notes: 'obs',
    });
  });
});

describe('itens da ficha', () => {
  it('alergia, condição, contato, médico e evento levam a criação em ISO', () => {
    const allergy: AllergyRow = {
      ...base,
      substance: 'Dipirona',
      reaction: null,
      severity: 'severe',
    };
    const condition: HealthConditionRow = {
      ...base,
      name: 'Asma',
      sinceOn: '2010-05-01',
      notes: null,
    };
    const contact: EmergencyContactRow = {
      ...base,
      name: 'Ana',
      relationship: 'Mãe',
      phone: '11987654321',
    };
    const doctor: DoctorRow = {
      ...base,
      name: 'Dr. João',
      specialty: null,
      phone: null,
      notes: null,
    };
    const event: HealthEventRow = {
      ...base,
      kind: 'exam',
      occurredOn: '2026-09-10',
      title: 'Hemograma',
      doctorId: null,
      notes: null,
    };

    for (const mapped of [
      toAllergy(allergy),
      toHealthCondition(condition),
      toEmergencyContact(contact),
      toDoctor(doctor),
      toHealthEvent(event),
    ]) {
      expect(mapped.id).toBe('id-1');
      expect(mapped.createdAt).toBe('2026-10-01T10:00:00.000Z');
    }
    expect(toHealthCondition(condition).sinceOn).toBe('2010-05-01');
    expect(toHealthEvent(event)).toMatchObject({ kind: 'exam', occurredOn: '2026-09-10' });
  });
});

describe('toMedication', () => {
  it('nunca expõe o controle interno do aviso de estoque', () => {
    const row: MedicationRow = {
      ...base,
      name: 'Dipirona',
      dosage: '500mg',
      instructions: '',
      times: ['08:00'],
      isContinuous: true,
      stockUnits: 10,
      unitsPerDose: 1,
      lowStockDays: 7,
      lowStockPromptedAt: new Date('2026-10-05T10:00:00.000Z'),
    };

    const medication = toMedication(row);

    expect(medication).not.toHaveProperty('lowStockPromptedAt');
    expect(medication).toMatchObject({
      memberId: 'member-1',
      name: 'Dipirona',
      times: ['08:00'],
      stockUnits: 10,
      createdAt: '2026-10-01T10:00:00.000Z',
    });
  });
});
