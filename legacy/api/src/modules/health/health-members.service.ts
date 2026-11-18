import { Injectable } from '@nestjs/common';
import type { HealthMembersResponse } from '@vibru/shared';
import { CoupleRepository } from '../couple/couple.repository';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { MedicationsService } from '../medications/medications.service';

@Injectable()
export class HealthMembersService {
  constructor(
    private readonly coupleRepository: CoupleRepository,
    private readonly medicationsService: MedicationsService,
  ) {}

  async list(member: CurrentMemberContext): Promise<HealthMembersResponse> {
    const [members, counts] = await Promise.all([
      this.coupleRepository.findMembers(member.coupleId),
      this.medicationsService.countByMember(member.coupleId),
    ]);
    const countByMember = new Map(counts.map((row) => [row.memberId, row.medicationCount]));

    return {
      members: members.map((entry) => ({
        memberId: entry.id,
        name: entry.displayName,
        medicationCount: countByMember.get(entry.id) ?? 0,
      })),
    };
  }
}
