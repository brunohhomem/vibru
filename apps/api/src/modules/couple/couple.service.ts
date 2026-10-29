import { BadRequestException, Injectable } from '@nestjs/common';
import {
  COUPLE_ERROR_CODES,
  bodasName,
  daysBetween,
  elapsedParts,
  nextAnnualOccurrence,
  todayInSaoPaulo,
  type CoupleResponse,
  type UpdateCoupleRequest,
  type UpdateMyMemberRequest,
} from '@vibru/shared';
import type { CoupleMemberRow } from './couple-member.entity';
import type { Couple } from './couple.entity';
import { CoupleRepository } from './couple.repository';
import type { CurrentMemberContext } from './decorators/current-member.decorator';

type CoupleDates = { datingStartedOn: string | null; marriedOn: string | null };

@Injectable()
export class CoupleService {
  constructor(private readonly coupleRepository: CoupleRepository) {}

  async getCouple(member: CurrentMemberContext): Promise<CoupleResponse> {
    const couple = await this.coupleRepository.findById(member.coupleId);
    if (!couple) throw new Error('Couple not found for the current member');

    const members = await this.coupleRepository.findMembers(member.coupleId);
    return this.buildResponse(couple, members, member.memberId);
  }

  async updateCouple(
    member: CurrentMemberContext,
    data: UpdateCoupleRequest,
  ): Promise<CoupleResponse> {
    const couple = await this.coupleRepository.findById(member.coupleId);
    if (!couple) throw new Error('Couple not found for the current member');

    // `null` é uma instrução para apagar a data; só `undefined` significa
    // "não mexi nesse campo".
    const combined: CoupleDates = {
      datingStartedOn:
        data.datingStartedOn !== undefined ? data.datingStartedOn : couple.datingStartedOn,
      marriedOn: data.marriedOn !== undefined ? data.marriedOn : couple.marriedOn,
    };

    this.assertDatesAreValid(combined);

    const updated = await this.coupleRepository.updateDates(member.coupleId, {
      datingStartedOn: combined.datingStartedOn,
      marriedOn: combined.marriedOn,
    });

    const members = await this.coupleRepository.findMembers(member.coupleId);
    return this.buildResponse(updated, members, member.memberId);
  }

  async updateMyMember(
    member: CurrentMemberContext,
    data: UpdateMyMemberRequest,
  ): Promise<CoupleResponse> {
    await this.coupleRepository.updateMemberDisplayName(
      member.coupleId,
      member.memberId,
      data.displayName,
    );

    const couple = await this.coupleRepository.findById(member.coupleId);
    if (!couple) throw new Error('Couple not found for the current member');

    const members = await this.coupleRepository.findMembers(member.coupleId);
    return this.buildResponse(couple, members, member.memberId);
  }

  private assertDatesAreValid(dates: CoupleDates): void {
    const today = todayInSaoPaulo(new Date());

    if (dates.datingStartedOn && daysBetween(today, dates.datingStartedOn) > 0) {
      throw this.invalidDates('datingStartedOn', 'O início do namoro não pode estar no futuro');
    }

    if (dates.marriedOn && daysBetween(today, dates.marriedOn) > 0) {
      throw this.invalidDates('marriedOn', 'O casamento não pode estar no futuro');
    }

    if (
      dates.datingStartedOn &&
      dates.marriedOn &&
      daysBetween(dates.datingStartedOn, dates.marriedOn) < 0
    ) {
      throw this.invalidDates('marriedOn', 'O casamento não pode ser antes do início do namoro');
    }
  }

  private invalidDates(field: keyof CoupleDates, message: string): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Datas do casal inválidas',
      code: COUPLE_ERROR_CODES.COUPLE_DATES_INVALID,
      details: [{ path: [field], message }],
      requestId: '',
      path: '/api/couple',
      timestamp: new Date().toISOString(),
    });
  }

  private buildResponse(
    couple: Couple,
    members: CoupleMemberRow[],
    currentMemberId: string,
  ): CoupleResponse {
    const today = todayInSaoPaulo(new Date());

    return {
      id: couple.id,
      datingStartedOn: couple.datingStartedOn,
      marriedOn: couple.marriedOn,
      today,
      members: members.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        color: member.color,
        isMe: member.id === currentMemberId,
      })),
      married: couple.marriedOn ? elapsedParts(couple.marriedOn, today) : null,
      nextWeddingAnniversary: couple.marriedOn
        ? this.buildWeddingAnniversary(couple.marriedOn, today)
        : null,
      nextDatingAnniversary: couple.datingStartedOn
        ? this.buildDatingAnniversary(couple.datingStartedOn, today)
        : null,
    };
  }

  private buildWeddingAnniversary(marriedOn: string, today: string) {
    const date = nextAnnualOccurrence(marriedOn, today);
    const years = Number(date.slice(0, 4)) - Number(marriedOn.slice(0, 4));

    return {
      date,
      years,
      bodasName: bodasName(years),
      daysUntil: daysBetween(today, date),
    };
  }

  private buildDatingAnniversary(datingStartedOn: string, today: string) {
    const date = nextAnnualOccurrence(datingStartedOn, today);
    const years = Number(date.slice(0, 4)) - Number(datingStartedOn.slice(0, 4));

    return { date, years, daysUntil: daysBetween(today, date) };
  }
}
