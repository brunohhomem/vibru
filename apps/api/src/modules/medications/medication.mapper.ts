import type { Medication } from '@vibru/shared';
import type { MedicationRow } from './medication.entity';

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
