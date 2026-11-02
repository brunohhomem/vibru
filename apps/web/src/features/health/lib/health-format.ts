import {
  daysOfMedicationLeft,
  type AllergySeverity,
  type BloodType,
  type Medication,
} from '@vibru/shared';

export function bloodTypeLabel(bloodType: BloodType): string {
  return bloodType === 'unknown' ? 'Não informado' : bloodType;
}

export const SEVERITY_LABELS: Record<AllergySeverity, string> = {
  mild: 'Leve',
  moderate: 'Moderada',
  severe: 'Grave',
};

export function organDonorLabel(organDonor: boolean | null): string {
  if (organDonor === null) return 'Não informado';
  return organDonor ? 'Sim' : 'Não';
}

/** Dias que o estoque ainda cobre, ou nulo quando não há controle ou horário. */
export function medicationDaysLeft(medication: Medication): number | null {
  return daysOfMedicationLeft({
    stockUnits: medication.stockUnits,
    unitsPerDose: medication.unitsPerDose,
    timesPerDay: medication.times.length,
  });
}

export function isMedicationLowStock(medication: Medication): boolean {
  const daysLeft = medicationDaysLeft(medication);
  return daysLeft !== null && daysLeft <= medication.lowStockDays;
}

export function medicationStockLabel(medication: Medication): string | null {
  if (medication.stockUnits === null) return null;

  const units = `${medication.stockUnits} ${medication.stockUnits === 1 ? 'unidade' : 'unidades'}`;
  const daysLeft = medicationDaysLeft(medication);
  if (daysLeft === null) return units;

  return `${units} · ~${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
}

export function medicationTitle(medication: Medication): string {
  return medication.dosage ? `${medication.name} ${medication.dosage}` : medication.name;
}

export function medicationScheduleLabel(medication: Medication): string {
  if (medication.times.length === 0) return 'Quando precisar';
  return medication.times.join(' · ');
}

/** Link `tel:` só com dígitos; o número guardado já vem sem máscara. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, '')}`;
}
