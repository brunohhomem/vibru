import { Injectable } from '@nestjs/common';
import type { DatabaseTransaction } from '../../database/database.module';
import type { MedicationRow, NewMedicationRow } from './medication.entity';
import { MedicationsRepository, type MedicationCountRow } from './medications.repository';

/**
 * Leitura e escrita dos remédios para os demais módulos. O ciclo de vida
 * (criar tarefas, sincronizar horários) fica no módulo `health`.
 */
@Injectable()
export class MedicationsService {
  constructor(private readonly medicationsRepository: MedicationsRepository) {}

  listByMember(coupleId: string, memberId: string): Promise<MedicationRow[]> {
    return this.medicationsRepository.listByMember(coupleId, memberId);
  }

  countByMember(coupleId: string): Promise<MedicationCountRow[]> {
    return this.medicationsRepository.countByMember(coupleId);
  }

  findActive(
    coupleId: string,
    medicationId: string,
    tx?: DatabaseTransaction,
  ): Promise<MedicationRow | null> {
    return this.medicationsRepository.findActive(coupleId, medicationId, tx);
  }

  create(data: NewMedicationRow, tx: DatabaseTransaction): Promise<MedicationRow> {
    return this.medicationsRepository.create(data, tx);
  }

  update(
    coupleId: string,
    medicationId: string,
    data: Partial<NewMedicationRow>,
    tx: DatabaseTransaction,
  ): Promise<MedicationRow> {
    return this.medicationsRepository.update(coupleId, medicationId, data, tx);
  }

  softDelete(coupleId: string, medicationId: string, tx: DatabaseTransaction): Promise<boolean> {
    return this.medicationsRepository.softDelete(coupleId, medicationId, tx);
  }
}
