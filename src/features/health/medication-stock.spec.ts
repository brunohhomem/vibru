import { describe, expect, it } from 'vitest';
import { daysOfMedicationLeft } from './medication-stock';

describe('daysOfMedicationLeft', () => {
  it('divide o estoque pelo consumo diário e arredonda para baixo', () => {
    expect(daysOfMedicationLeft({ stockUnits: 15, unitsPerDose: 1, timesPerDay: 2 })).toBe(7);
    expect(daysOfMedicationLeft({ stockUnits: 10, unitsPerDose: 2, timesPerDay: 2 })).toBe(2);
  });

  it('devolve zero com estoque vazio', () => {
    expect(daysOfMedicationLeft({ stockUnits: 0, unitsPerDose: 1, timesPerDay: 1 })).toBe(0);
  });

  it('devolve nulo sem estoque controlado ou sem horário', () => {
    expect(daysOfMedicationLeft({ stockUnits: null, unitsPerDose: 1, timesPerDay: 1 })).toBeNull();
    expect(daysOfMedicationLeft({ stockUnits: 10, unitsPerDose: 1, timesPerDay: 0 })).toBeNull();
  });
});
