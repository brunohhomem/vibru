import {
  bodasName,
  daysBetween,
  elapsedParts,
  nextAnnualOccurrence,
  type CoupleResponse,
  type MemberColor,
} from '@vibru/shared';

export type CoupleRecord = {
  id: string;
  datingStartedOn: string | null;
  marriedOn: string | null;
};

export type MemberRecord = { id: string; displayName: string; color: MemberColor };

type BuildCoupleResponseInput = {
  couple: CoupleRecord;
  members: MemberRecord[];
  currentMemberId: string;
  today: string;
};

function yearsUntilOccurrence(originalDate: string, occurrenceDate: string): number {
  return Number(occurrenceDate.slice(0, 4)) - Number(originalDate.slice(0, 4));
}

function buildWeddingAnniversary(marriedOn: string, today: string) {
  const date = nextAnnualOccurrence(marriedOn, today);
  const years = yearsUntilOccurrence(marriedOn, date);
  return { date, years, bodasName: bodasName(years), daysUntil: daysBetween(today, date) };
}

function buildDatingAnniversary(datingStartedOn: string, today: string) {
  const date = nextAnnualOccurrence(datingStartedOn, today);
  const years = yearsUntilOccurrence(datingStartedOn, date);
  return { date, years, daysUntil: daysBetween(today, date) };
}

export function buildCoupleResponse(input: BuildCoupleResponseInput): CoupleResponse {
  const { couple, members, currentMemberId, today } = input;

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
      ? buildWeddingAnniversary(couple.marriedOn, today)
      : null,
    nextDatingAnniversary: couple.datingStartedOn
      ? buildDatingAnniversary(couple.datingStartedOn, today)
      : null,
  };
}
