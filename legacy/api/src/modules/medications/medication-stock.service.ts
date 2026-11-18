import { Injectable } from '@nestjs/common';
import { daysOfMedicationLeft, type TaskLowStock } from '@vibru/shared';
import type { DatabaseTransaction } from '../../database/database.module';
import { MedicationsRepository } from './medications.repository';

/**
 * Estoque dos remédios. Roda dentro da transação de concluir/reabrir a
 * tarefa, para que a conclusão e o desconto nunca se separem (ADR 0004, 4.4).
 */
@Injectable()
export class MedicationStockService {
  constructor(private readonly medicationsRepository: MedicationsRepository) {}

  /**
   * Desconta a dose. Devolve o aviso de estoque baixo uma única vez por
   * reposição (ADR 0004, regra 4.5); nulo quando não há o que avisar.
   */
  async consumeDose(
    coupleId: string,
    medicationId: string,
    tx: DatabaseTransaction,
  ): Promise<TaskLowStock | null> {
    const medication = await this.medicationsRepository.decrementStock(coupleId, medicationId, tx);
    if (!medication) return null;

    const daysLeft = daysOfMedicationLeft({
      stockUnits: medication.stockUnits,
      unitsPerDose: medication.unitsPerDose,
      timesPerDay: medication.times.length,
    });
    if (daysLeft === null || daysLeft > medication.lowStockDays) return null;

    const claimed = await this.medicationsRepository.markLowStockPrompted(
      coupleId,
      medicationId,
      new Date(),
      tx,
    );
    if (!claimed) return null;

    return { medicationId: medication.id, name: medication.name, daysLeft };
  }

  async returnDose(coupleId: string, medicationId: string, tx: DatabaseTransaction): Promise<void> {
    await this.medicationsRepository.incrementStock(coupleId, medicationId, tx);
  }
}
