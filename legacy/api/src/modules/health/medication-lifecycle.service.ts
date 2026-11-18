import { Inject, Injectable } from '@nestjs/common';
import {
  todayInSaoPaulo,
  type CreateMedicationRequest,
  type Medication,
  type UpdateMedicationRequest,
} from '@vibru/shared';
import { DATABASE, type Database } from '../../database/database.module';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import type { MedicationRow, NewMedicationRow } from '../medications/medication.entity';
import { toMedication } from '../medications/medication.mapper';
import { MedicationsService } from '../medications/medications.service';
import { MedicationTasksService } from '../tasks/medication-tasks.service';
import { HealthMemberAccessService } from './health-member-access.service';
import { isUuid, medicationNotFound } from './health.errors';

/**
 * Ciclo de vida do remédio: cada mudança e a sincronização das tarefas
 * dele acontecem na mesma transação (ADR 0004, regra 4.2).
 */
@Injectable()
export class MedicationLifecycleService {
  constructor(
    private readonly medicationsService: MedicationsService,
    private readonly medicationTasksService: MedicationTasksService,
    private readonly memberAccess: HealthMemberAccessService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async create(
    member: CurrentMemberContext,
    memberId: string,
    data: CreateMedicationRequest,
  ): Promise<Medication> {
    await this.memberAccess.requireMember(member.coupleId, memberId);

    const row = await this.db.transaction(async (tx) => {
      const created = await this.medicationsService.create(
        { ...data, times: sortTimes(data.times), coupleId: member.coupleId, memberId },
        tx,
      );
      await this.medicationTasksService.sync(this.taskSpec(created), tx);
      return created;
    });

    return toMedication(row);
  }

  async update(
    member: CurrentMemberContext,
    medicationId: string,
    data: UpdateMedicationRequest,
  ): Promise<Medication> {
    const existing = await this.requireMedication(member.coupleId, medicationId);

    const row = await this.db.transaction(async (tx) => {
      const updated = await this.medicationsService.update(
        member.coupleId,
        medicationId,
        buildUpdatePatch(existing, data),
        tx,
      );
      await this.medicationTasksService.sync(this.taskSpec(updated), tx);
      return updated;
    });

    return toMedication(row);
  }

  async remove(member: CurrentMemberContext, medicationId: string): Promise<void> {
    await this.requireMedication(member.coupleId, medicationId);

    await this.db.transaction(async (tx) => {
      await this.medicationsService.softDelete(member.coupleId, medicationId, tx);
      await this.medicationTasksService.removeOpen(member.coupleId, medicationId, tx);
    });
  }

  async requireMedication(coupleId: string, medicationId: string): Promise<MedicationRow> {
    if (!isUuid(medicationId)) throw medicationNotFound();

    const row = await this.medicationsService.findActive(coupleId, medicationId);
    if (!row) throw medicationNotFound();

    return row;
  }

  private taskSpec(medication: MedicationRow) {
    return {
      coupleId: medication.coupleId,
      medicationId: medication.id,
      memberId: medication.memberId,
      title: medicationTaskTitle(medication),
      times: medication.times,
      today: todayInSaoPaulo(new Date()),
    };
  }
}

function medicationTaskTitle(medication: MedicationRow): string {
  return `Tomar ${medication.name} ${medication.dosage}`.trim();
}

function sortTimes(times: string[]): string[] {
  return [...times].sort();
}

/**
 * Repor o estoque (valor maior que o atual) libera a próxima pergunta da
 * Farmácia (ADR 0004, regra 4.7).
 */
function buildUpdatePatch(
  existing: MedicationRow,
  data: UpdateMedicationRequest,
): Partial<NewMedicationRow> {
  const patch: Partial<NewMedicationRow> = { ...data };
  if (data.times !== undefined) patch.times = sortTimes(data.times);
  if (isRestock(existing, data)) patch.lowStockPromptedAt = null;

  return patch;
}

function isRestock(existing: MedicationRow, data: UpdateMedicationRequest): boolean {
  if (data.stockUnits === undefined || data.stockUnits === null) return false;
  if (existing.stockUnits === null) return true;

  return data.stockUnits > existing.stockUnits;
}
