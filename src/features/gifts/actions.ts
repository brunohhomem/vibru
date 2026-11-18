'use server';

import { z } from 'zod';
import type { GiftRow } from '@/db/gifts-schema';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { decideImageUrl, type ImageDecision } from '@/features/link-preview/decide-image-url';
import { findOgImageUrl } from '@/features/link-preview/og-image-service';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { toGiftResponse } from './gift-mappers';
import {
  createGiftRequestSchema,
  giftStatusSchema,
  updateGiftRequestSchema,
  type GiftResponse,
  type GiftsResponse,
} from './gift-schemas';
import {
  findActiveGift,
  insertGift,
  listGiftsByStatus,
  releaseGift,
  reserveGift,
  softDeleteGift,
  updateGift,
} from './gifts-repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GIFT_NOT_FOUND_MESSAGE = 'Presente não encontrado';
const NOT_OWNER_MESSAGE = 'Só o dono mexe na própria lista';
const SELF_RESERVATION_MESSAGE = 'Você não reserva presentes da própria lista';
const ALREADY_RESERVED_MESSAGE = 'Este presente já foi reservado';

const listSchema = z.object({ ownerId: z.string(), status: giftStatusSchema });
const createSchema = z.object({ ownerId: z.string(), data: createGiftRequestSchema });
const updateSchema = z.object({
  ownerId: z.string(),
  giftId: z.string(),
  data: updateGiftRequestSchema,
});
const giftRefSchema = z.object({ ownerId: z.string(), giftId: z.string() });

type Viewer = { coupleId: string; memberId: string };

/** Membro ou presente de outro casal, removido ou id malformado respondem igual. */
async function requireOwnerInCouple(coupleId: string, ownerId: string): Promise<void> {
  const members = UUID_PATTERN.test(ownerId) ? await findCoupleMembers(coupleId) : [];
  if (!members.some((candidate) => candidate.id === ownerId)) {
    throw new ActionFailure('failed', GIFT_NOT_FOUND_MESSAGE);
  }
}

async function requireGift(coupleId: string, ownerId: string, giftId: string): Promise<GiftRow> {
  await requireOwnerInCouple(coupleId, ownerId);
  const gift = UUID_PATTERN.test(giftId) ? await findActiveGift(coupleId, ownerId, giftId) : null;
  if (!gift) throw new ActionFailure('failed', GIFT_NOT_FOUND_MESSAGE);
  return gift;
}

async function requireOwnGift(viewer: Viewer, ownerId: string, giftId: string): Promise<GiftRow> {
  const gift = await requireGift(viewer.coupleId, ownerId, giftId);
  if (gift.ownerMemberId !== viewer.memberId) throw new ActionFailure('failed', NOT_OWNER_MESSAGE);
  return gift;
}

/** `undefined` mantém a imagem atual; nulo a apaga; texto a troca. */
async function resolveImageUrl(decision: ImageDecision): Promise<string | null | undefined> {
  if (decision.kind === 'lookup') return findOgImageUrl(decision.url);
  if (decision.kind === 'set') return decision.value;
  return undefined;
}

export const listGiftsAction = defineMemberAction({
  schema: listSchema,
  handler: async ({ input, member }): Promise<GiftsResponse> => {
    await requireOwnerInCouple(member.coupleId, input.ownerId);
    const rows = await listGiftsByStatus(member.coupleId, input.ownerId, input.status);
    return { gifts: rows.map((row) => toGiftResponse(row, member.memberId)) };
  },
});

export const createGiftAction = defineMemberAction({
  schema: createSchema,
  handler: async ({ input, member }): Promise<GiftResponse> => {
    await requireOwnerInCouple(member.coupleId, input.ownerId);
    if (member.memberId !== input.ownerId) throw new ActionFailure('failed', NOT_OWNER_MESSAGE);

    const { data } = input;
    const imageUrl = data.imageUrl ?? (data.url ? await findOgImageUrl(data.url) : null);
    const row = await insertGift({
      ...data,
      imageUrl,
      coupleId: member.coupleId,
      ownerMemberId: input.ownerId,
    });
    return toGiftResponse(row, member.memberId);
  },
});

export const updateGiftAction = defineMemberAction({
  schema: updateSchema,
  handler: async ({ input, member }): Promise<GiftResponse> => {
    const gift = await requireOwnGift(member, input.ownerId, input.giftId);
    const imageUrl = await resolveImageUrl(decideImageUrl(gift, input.data));

    const row = await updateGift(member.coupleId, input.ownerId, input.giftId, {
      ...input.data,
      imageUrl,
    });
    return toGiftResponse(row, member.memberId);
  },
});

export const markGiftReceivedAction = defineMemberAction({
  schema: giftRefSchema,
  handler: async ({ input, member }): Promise<GiftResponse> => {
    await requireOwnGift(member, input.ownerId, input.giftId);
    const row = await updateGift(member.coupleId, input.ownerId, input.giftId, {
      receivedAt: new Date(),
    });
    return toGiftResponse(row, member.memberId);
  },
});

export const removeGiftAction = defineMemberAction({
  schema: giftRefSchema,
  handler: async ({ input, member }): Promise<null> => {
    await requireOwnGift(member, input.ownerId, input.giftId);
    if (!(await softDeleteGift(member.coupleId, input.ownerId, input.giftId))) {
      throw new ActionFailure('failed', GIFT_NOT_FOUND_MESSAGE);
    }
    return null;
  },
});

export const reserveGiftAction = defineMemberAction({
  schema: giftRefSchema,
  handler: async ({ input, member }): Promise<GiftResponse> => {
    const gift = await requireGift(member.coupleId, input.ownerId, input.giftId);
    if (gift.ownerMemberId === member.memberId) {
      throw new ActionFailure('failed', SELF_RESERVATION_MESSAGE);
    }

    const reserved = await reserveGift(gift, member.memberId);
    if (!reserved) throw new ActionFailure('failed', ALREADY_RESERVED_MESSAGE);
    return toGiftResponse(reserved, member.memberId);
  },
});

/** Só quem reservou desfaz; o dono recebe a mesma recusa de quem tenta reservar a própria lista. */
export const releaseGiftAction = defineMemberAction({
  schema: giftRefSchema,
  handler: async ({ input, member }): Promise<GiftResponse> => {
    const gift = await requireGift(member.coupleId, input.ownerId, input.giftId);
    if (gift.ownerMemberId === member.memberId) {
      throw new ActionFailure('failed', SELF_RESERVATION_MESSAGE);
    }

    await releaseGift(gift, member.memberId);
    const current = await requireGift(member.coupleId, input.ownerId, input.giftId);
    return toGiftResponse(current, member.memberId);
  },
});
