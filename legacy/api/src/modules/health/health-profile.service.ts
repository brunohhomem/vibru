import { Injectable } from '@nestjs/common';
import type { HealthProfile, UpdateHealthProfileRequest } from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { HealthMemberAccessService } from './health-member-access.service';
import { HealthProfileRepository } from './health-profile.repository';
import { toHealthProfile } from './health.mappers';

@Injectable()
export class HealthProfileService {
  constructor(
    private readonly profileRepository: HealthProfileRepository,
    private readonly memberAccess: HealthMemberAccessService,
  ) {}

  /** Salvar substitui a ficha inteira: campo ausente no corpo vira vazio. */
  async save(
    member: CurrentMemberContext,
    memberId: string,
    data: UpdateHealthProfileRequest,
  ): Promise<HealthProfile> {
    await this.memberAccess.requireMember(member.coupleId, memberId);

    const row = await this.profileRepository.upsert({
      coupleId: member.coupleId,
      memberId,
      bloodType: data.bloodType,
      organDonor: data.organDonor ?? null,
      healthPlanName: emptyToNull(data.healthPlanName),
      healthPlanNumber: emptyToNull(data.healthPlanNumber),
      preferredHospital: emptyToNull(data.preferredHospital),
      notes: emptyToNull(data.notes),
    });

    return toHealthProfile(row);
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value === '' ? null : value;
}
