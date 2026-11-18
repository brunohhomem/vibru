'use server';

import { z } from 'zod';
import { defineMemberAction } from '@/lib/define-member-action';
import { ActionFailure } from '@/lib/define-action';
import { findCoupleDateIssues, mergeCoupleDates } from './couple-dates';
import {
  findCoupleById,
  findCoupleMembers,
  updateCoupleDates,
  updateMemberDisplayName,
} from './couple-repository';
import { buildCoupleResponse } from './couple-response';
import { todayInSaoPaulo } from '@/lib/calendar-date';
import {
  updateCoupleRequestSchema,
  updateMyMemberRequestSchema,
  type CoupleResponse,
} from '@/features/couple/couple-schemas';

async function loadCoupleResponse(coupleId: string, memberId: string): Promise<CoupleResponse> {
  const couple = await findCoupleById(coupleId);
  if (!couple) throw new Error('Couple not found for the current member');

  const members = await findCoupleMembers(coupleId);
  return buildCoupleResponse({
    couple,
    members,
    currentMemberId: memberId,
    today: todayInSaoPaulo(new Date()),
  });
}

export const getCoupleAction = defineMemberAction({
  schema: z.undefined(),
  handler: ({ member }) => loadCoupleResponse(member.coupleId, member.memberId),
});

export const updateCoupleAction = defineMemberAction({
  schema: updateCoupleRequestSchema,
  handler: async ({ input, member }) => {
    const couple = await findCoupleById(member.coupleId);
    if (!couple) throw new Error('Couple not found for the current member');

    const merged = mergeCoupleDates(couple, input);
    const [firstIssue] = findCoupleDateIssues(merged, todayInSaoPaulo(new Date()));
    if (firstIssue) throw new ActionFailure('invalid_input', firstIssue.message, firstIssue.field);

    await updateCoupleDates(member.coupleId, merged);
    return loadCoupleResponse(member.coupleId, member.memberId);
  },
});

export const updateMyMemberAction = defineMemberAction({
  schema: updateMyMemberRequestSchema,
  handler: async ({ input, member }) => {
    await updateMemberDisplayName(member.coupleId, member.memberId, input.displayName);
    return loadCoupleResponse(member.coupleId, member.memberId);
  },
});
