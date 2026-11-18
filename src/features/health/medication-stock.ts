export type MedicationStockInput = {
  stockUnits: number | null;
  unitsPerDose: number;
  timesPerDay: number;
};

/**
 * Dias de estoque restantes: `floor(estoque / (dose × horários))`. Nulo
 * quando o estoque não é controlado ou o remédio não tem horário ("quando
 * precisar"), porque não há consumo previsível.
 */
export function daysOfMedicationLeft(input: MedicationStockInput): number | null {
  if (input.stockUnits === null) return null;
  if (input.timesPerDay <= 0) return null;

  return Math.floor(input.stockUnits / (input.unitsPerDose * input.timesPerDay));
}
