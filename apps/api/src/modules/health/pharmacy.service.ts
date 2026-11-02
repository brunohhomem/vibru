import { Injectable } from '@nestjs/common';
import type { PharmacyResult } from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { NamedListService } from '../lists/named-list.service';
import { MedicationLifecycleService } from './medication-lifecycle.service';

const PHARMACY_LIST_TITLE = 'Farmácia';

/** Resposta "Sim" à pergunta de estoque baixo (ADR 0004, regra 4.6). */
@Injectable()
export class PharmacyService {
  constructor(
    private readonly medicationLifecycle: MedicationLifecycleService,
    private readonly namedListService: NamedListService,
  ) {}

  async addMedication(member: CurrentMemberContext, medicationId: string): Promise<PharmacyResult> {
    const medication = await this.medicationLifecycle.requireMedication(
      member.coupleId,
      medicationId,
    );

    return this.namedListService.addItem(member.coupleId, PHARMACY_LIST_TITLE, medication.name);
  }
}
