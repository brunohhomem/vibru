import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '@/db/client';

const mocks = vi.hoisted(() => ({
  decrementStock: vi.fn(),
  incrementStock: vi.fn(),
  markLowStockPrompted: vi.fn(),
}));

vi.mock('./medications-repository', () => ({
  decrementStock: mocks.decrementStock,
  incrementStock: mocks.incrementStock,
  markLowStockPrompted: mocks.markLowStockPrompted,
}));

import { consumeDose, returnDose } from './medication-stock-operations';

const executor = { tx: true } as unknown as DatabaseExecutor;

function medicationAfterDose(overrides: Record<string, unknown> = {}) {
  return {
    id: 'med-1',
    name: 'Dipirona',
    stockUnits: 14,
    unitsPerDose: 1,
    times: ['08:00', '20:00'],
    lowStockDays: 7,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('consumeDose', () => {
  it('estoque não controlado: nada a descontar, nada a avisar', async () => {
    mocks.decrementStock.mockResolvedValue(null);

    expect(await consumeDose('couple-1', 'med-1', executor)).toBeNull();
    expect(mocks.markLowStockPrompted).not.toHaveBeenCalled();
  });

  it('estoque ainda alto: desconta e não avisa', async () => {
    mocks.decrementStock.mockResolvedValue(medicationAfterDose({ stockUnits: 100 }));

    expect(await consumeDose('couple-1', 'med-1', executor)).toBeNull();
    expect(mocks.decrementStock).toHaveBeenCalledWith('couple-1', 'med-1', executor);
    expect(mocks.markLowStockPrompted).not.toHaveBeenCalled();
  });

  it('estoque baixo e aviso ainda não dado: devolve o aviso', async () => {
    mocks.decrementStock.mockResolvedValue(medicationAfterDose());
    mocks.markLowStockPrompted.mockResolvedValue(true);

    expect(await consumeDose('couple-1', 'med-1', executor)).toEqual({
      medicationId: 'med-1',
      name: 'Dipirona',
      daysLeft: 7,
    });
    expect(mocks.markLowStockPrompted).toHaveBeenCalledWith(
      'couple-1',
      'med-1',
      expect.any(Date),
      executor,
    );
  });

  it('estoque baixo mas aviso já dado (outra conclusão levou): não avisa de novo', async () => {
    mocks.decrementStock.mockResolvedValue(medicationAfterDose());
    mocks.markLowStockPrompted.mockResolvedValue(false);

    expect(await consumeDose('couple-1', 'med-1', executor)).toBeNull();
  });
});

describe('returnDose', () => {
  it('devolve a dose ao estoque do casal', async () => {
    await returnDose('couple-1', 'med-1', executor);

    expect(mocks.incrementStock).toHaveBeenCalledWith('couple-1', 'med-1', executor);
  });
});
