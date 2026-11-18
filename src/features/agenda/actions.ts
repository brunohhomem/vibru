'use server';

import { z } from 'zod';
import { findCoupleMembers, updateMemberIcsTokenHash } from '@/features/couple/couple-repository';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { monthRange, pickUpcoming, upcomingRange } from './agenda-entries';
import { toAgendaEvent, toImportantDate } from './agenda-mappers';
import {
  agendaMonthSchema,
  createAgendaEventRequestSchema,
  createImportantDateRequestSchema,
  updateAgendaEventRequestSchema,
  updateImportantDateRequestSchema,
  type AgendaEvent,
  type AgendaResponse,
  type AgendaUpcomingResponse,
  type IcsFeedCreated,
  type IcsFeedStatus,
  type ImportantDate,
} from './agenda-schemas';
import { findActiveEvent, insertEvent, softDeleteEvent, updateEvent } from './agenda-repository';
import { loadCalendarEntries } from './calendar-source';
import { generateFeedToken, hashFeedToken } from './ics-feed-rules';
import { todayInSaoPaulo } from '@/lib/calendar-date';
import {
  findActiveImportantDate,
  insertImportantDate,
  softDeleteImportantDate,
  updateImportantDate,
} from './important-dates-repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_NOT_FOUND_MESSAGE = 'Item não encontrado';

const monthSchema = z.object({ month: agendaMonthSchema });
const idSchema = z.object({ id: z.string() });
const updateEventSchema = z.object({ id: z.string(), data: updateAgendaEventRequestSchema });
const updateImportantDateSchema = z.object({
  id: z.string(),
  data: updateImportantDateRequestSchema,
});

function requireValidId(id: string): void {
  if (!UUID_PATTERN.test(id)) throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
}

async function requireEvent(coupleId: string, eventId: string): Promise<void> {
  requireValidId(eventId);
  if (!(await findActiveEvent(coupleId, eventId))) {
    throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
  }
}

async function requireImportantDate(coupleId: string, dateId: string): Promise<void> {
  requireValidId(dateId);
  if (!(await findActiveImportantDate(coupleId, dateId))) {
    throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
  }
}

export const getAgendaMonthAction = defineMemberAction({
  schema: monthSchema,
  handler: async ({ input, member }): Promise<AgendaResponse> => ({
    month: input.month,
    today: todayInSaoPaulo(new Date()),
    ...(await loadCalendarEntries(member.coupleId, monthRange(input.month))),
  }),
});

export const getAgendaUpcomingAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<AgendaUpcomingResponse> => {
    const today = todayInSaoPaulo(new Date());
    const entries = await loadCalendarEntries(member.coupleId, upcomingRange(today));
    return { today, next: pickUpcoming(entries, today) };
  },
});

export const createAgendaEventAction = defineMemberAction({
  schema: createAgendaEventRequestSchema,
  handler: async ({ input, member }): Promise<AgendaEvent> =>
    toAgendaEvent(await insertEvent({ ...input, coupleId: member.coupleId })),
});

export const updateAgendaEventAction = defineMemberAction({
  schema: updateEventSchema,
  handler: async ({ input, member }): Promise<AgendaEvent> => {
    await requireEvent(member.coupleId, input.id);
    return toAgendaEvent(await updateEvent(member.coupleId, input.id, input.data));
  },
});

export const removeAgendaEventAction = defineMemberAction({
  schema: idSchema,
  handler: async ({ input, member }): Promise<null> => {
    await requireEvent(member.coupleId, input.id);
    if (!(await softDeleteEvent(member.coupleId, input.id))) {
      throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
    }
    return null;
  },
});

export const createImportantDateAction = defineMemberAction({
  schema: createImportantDateRequestSchema,
  handler: async ({ input, member }): Promise<ImportantDate> =>
    toImportantDate(await insertImportantDate({ ...input, coupleId: member.coupleId })),
});

export const updateImportantDateAction = defineMemberAction({
  schema: updateImportantDateSchema,
  handler: async ({ input, member }): Promise<ImportantDate> => {
    await requireImportantDate(member.coupleId, input.id);
    return toImportantDate(await updateImportantDate(member.coupleId, input.id, input.data));
  },
});

export const removeImportantDateAction = defineMemberAction({
  schema: idSchema,
  handler: async ({ input, member }): Promise<null> => {
    await requireImportantDate(member.coupleId, input.id);
    if (!(await softDeleteImportantDate(member.coupleId, input.id))) {
      throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
    }
    return null;
  },
});

export const getIcsFeedStatusAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<IcsFeedStatus> => {
    const self = (await findCoupleMembers(member.coupleId)).find(
      (candidate) => candidate.id === member.memberId,
    );
    return { active: Boolean(self?.icsTokenHash) };
  },
});

/** O caminho só existe nesta resposta: o banco guarda apenas o hash do token. */
export const regenerateIcsFeedAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<IcsFeedCreated> => {
    const token = generateFeedToken();
    await updateMemberIcsTokenHash(member.coupleId, member.memberId, hashFeedToken(token));
    return { feedPath: `/api/ics/${token}.ics` };
  },
});

export const revokeIcsFeedAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<null> => {
    await updateMemberIcsTokenHash(member.coupleId, member.memberId, null);
    return null;
  },
});
