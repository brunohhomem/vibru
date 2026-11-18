import { Injectable } from '@nestjs/common';
import { CoupleRepository } from '../couple/couple.repository';
import type { CoupleMemberRow } from '../couple/couple-member.entity';
import { isUuid, memberNotFound } from './health.errors';

/**
 * Garante que a ficha pedida pertence a um membro do mesmo casal. Membro de
 * outro casal ou uuid malformado respondem igual (404), sem revelar existência.
 */
@Injectable()
export class HealthMemberAccessService {
  constructor(private readonly coupleRepository: CoupleRepository) {}

  async requireMember(coupleId: string, memberId: string): Promise<CoupleMemberRow> {
    if (!isUuid(memberId)) throw memberNotFound();

    const member = await this.coupleRepository.findMember(coupleId, memberId);
    if (!member) throw memberNotFound();

    return member;
  }
}
