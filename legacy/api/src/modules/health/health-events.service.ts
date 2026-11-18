import { Injectable } from '@nestjs/common';
import type {
  CreateHealthEventRequest,
  HealthEvent,
  UpdateHealthEventRequest,
} from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { DoctorsRepository } from './doctors.repository';
import { HealthEventsRepository } from './health-events.repository';
import { HealthMemberAccessService } from './health-member-access.service';
import { isUuid, itemNotFound } from './health.errors';
import { toHealthEvent } from './health.mappers';

@Injectable()
export class HealthEventsService {
  constructor(
    private readonly repository: HealthEventsRepository,
    private readonly doctorsRepository: DoctorsRepository,
    private readonly memberAccess: HealthMemberAccessService,
  ) {}

  async create(
    member: CurrentMemberContext,
    memberId: string,
    data: CreateHealthEventRequest,
  ): Promise<HealthEvent> {
    await this.memberAccess.requireMember(member.coupleId, memberId);
    await this.requireDoctor(member.coupleId, memberId, data.doctorId);

    const row = await this.repository.create({ ...data, coupleId: member.coupleId, memberId });
    return toHealthEvent(row);
  }

  async update(
    member: CurrentMemberContext,
    memberId: string,
    itemId: string,
    data: UpdateHealthEventRequest,
  ): Promise<HealthEvent> {
    await this.requireItem(member.coupleId, memberId, itemId);
    await this.requireDoctor(member.coupleId, memberId, data.doctorId);

    const row = await this.repository.update(member.coupleId, memberId, itemId, data);
    return toHealthEvent(row);
  }

  async remove(member: CurrentMemberContext, memberId: string, itemId: string): Promise<void> {
    await this.requireItem(member.coupleId, memberId, itemId);

    const deleted = await this.repository.softDelete(member.coupleId, memberId, itemId);
    if (!deleted) throw itemNotFound();
  }

  private async requireItem(coupleId: string, memberId: string, itemId: string): Promise<void> {
    await this.memberAccess.requireMember(coupleId, memberId);
    if (!isUuid(itemId)) throw itemNotFound();

    const row = await this.repository.findActive(coupleId, memberId, itemId);
    if (!row) throw itemNotFound();
  }

  /** O vínculo só vale para médico da ficha do mesmo membro; a FK não garante o casal. */
  private async requireDoctor(
    coupleId: string,
    memberId: string,
    doctorId: string | null | undefined,
  ): Promise<void> {
    if (!doctorId) return;

    const doctor = await this.doctorsRepository.findActive(coupleId, memberId, doctorId);
    if (!doctor) throw itemNotFound();
  }
}
