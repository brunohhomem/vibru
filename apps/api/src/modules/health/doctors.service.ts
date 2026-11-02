import { Injectable } from '@nestjs/common';
import type { Doctor, CreateDoctorRequest, UpdateDoctorRequest } from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { DoctorsRepository } from './doctors.repository';
import { HealthMemberAccessService } from './health-member-access.service';
import { isUuid, itemNotFound } from './health.errors';
import { toDoctor } from './health.mappers';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly repository: DoctorsRepository,
    private readonly memberAccess: HealthMemberAccessService,
  ) {}

  async create(
    member: CurrentMemberContext,
    memberId: string,
    data: CreateDoctorRequest,
  ): Promise<Doctor> {
    await this.memberAccess.requireMember(member.coupleId, memberId);

    const row = await this.repository.create({ ...data, coupleId: member.coupleId, memberId });
    return toDoctor(row);
  }

  async update(
    member: CurrentMemberContext,
    memberId: string,
    itemId: string,
    data: UpdateDoctorRequest,
  ): Promise<Doctor> {
    await this.requireItem(member.coupleId, memberId, itemId);

    const row = await this.repository.update(member.coupleId, memberId, itemId, data);
    return toDoctor(row);
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
}
