'use server';

import { z } from 'zod';
import { detachWishFromEvents, insertEvent } from '@/features/agenda/agenda-repository';
import { toAgendaEvent } from '@/features/agenda/agenda-mappers';
import type { AgendaEvent } from '@/features/agenda/agenda-schemas';
import { decideImageUrl, type ImageDecision } from '@/features/link-preview/decide-image-url';
import { findOgImageUrl } from '@/features/link-preview/og-image-service';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { toWish, type WishWithPlan } from './wish-mappers';
import { todayInSaoPaulo } from '@/lib/calendar-date';
import {
  createWishRequestSchema,
  planWishRequestSchema,
  updateWishRequestSchema,
  wishStatusSchema,
  type Wish,
  type WishesResponse,
} from './wish-schemas';
import {
  findActiveWish,
  insertWish,
  listWishesByStatus,
  softDeleteWish,
  updateWish,
} from './wishes-repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WISH_NOT_FOUND_MESSAGE = 'Desejo não encontrado';

const listSchema = z.object({ status: wishStatusSchema });
const idSchema = z.object({ id: z.string() });
const updateSchema = z.object({ id: z.string(), data: updateWishRequestSchema });
const doneSchema = z.object({ id: z.string(), done: z.boolean() });
const planSchema = z.object({ id: z.string(), data: planWishRequestSchema });

function today(): string {
  return todayInSaoPaulo(new Date());
}

/** Desejo de outro casal, removido ou id malformado respondem igual. */
async function requireWish(coupleId: string, wishId: string): Promise<WishWithPlan> {
  const row = UUID_PATTERN.test(wishId) ? await findActiveWish(coupleId, wishId, today()) : null;
  if (!row) throw new ActionFailure('failed', WISH_NOT_FOUND_MESSAGE);
  return row;
}

/** `undefined` mantém a imagem atual; nulo a apaga; texto a troca. */
async function resolveImageUrl(decision: ImageDecision): Promise<string | null | undefined> {
  if (decision.kind === 'lookup') return findOgImageUrl(decision.url);
  if (decision.kind === 'set') return decision.value;
  return undefined;
}

async function reload(coupleId: string, wishId: string): Promise<Wish> {
  return toWish(await requireWish(coupleId, wishId));
}

export const listWishesAction = defineMemberAction({
  schema: listSchema,
  handler: async ({ input, member }): Promise<WishesResponse> => ({
    wishes: (await listWishesByStatus(member.coupleId, input.status, today())).map(toWish),
  }),
});

export const createWishAction = defineMemberAction({
  schema: createWishRequestSchema,
  handler: async ({ input, member }): Promise<Wish> => {
    const imageUrl = input.imageUrl ?? (input.url ? await findOgImageUrl(input.url) : null);
    const row = await insertWish({ ...input, imageUrl, coupleId: member.coupleId });
    return reload(member.coupleId, row.id);
  },
});

export const updateWishAction = defineMemberAction({
  schema: updateSchema,
  handler: async ({ input, member }): Promise<Wish> => {
    const current = await requireWish(member.coupleId, input.id);
    const imageUrl = await resolveImageUrl(decideImageUrl(current, input.data));

    await updateWish(member.coupleId, input.id, { ...input.data, imageUrl });
    return reload(member.coupleId, input.id);
  },
});

export const setWishDoneAction = defineMemberAction({
  schema: doneSchema,
  handler: async ({ input, member }): Promise<Wish> => {
    await requireWish(member.coupleId, input.id);
    await updateWish(member.coupleId, input.id, { doneAt: input.done ? new Date() : null });
    return reload(member.coupleId, input.id);
  },
});

/** "Planejar" um desejo: o evento nasce com o título do desejo e fica ligado a ele. */
export const planWishAction = defineMemberAction({
  schema: planSchema,
  handler: async ({ input, member }): Promise<AgendaEvent> => {
    const wish = await requireWish(member.coupleId, input.id);
    const event = await insertEvent({
      ...input.data,
      title: wish.title,
      wishId: wish.id,
      coupleId: member.coupleId,
    });
    return toAgendaEvent(event);
  },
});

export const removeWishAction = defineMemberAction({
  schema: idSchema,
  handler: async ({ input, member }): Promise<null> => {
    await requireWish(member.coupleId, input.id);

    await detachWishFromEvents(member.coupleId, input.id);
    if (!(await softDeleteWish(member.coupleId, input.id))) {
      throw new ActionFailure('failed', WISH_NOT_FOUND_MESSAGE);
    }
    return null;
  },
});
