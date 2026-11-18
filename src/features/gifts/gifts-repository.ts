import { and, asc, desc, eq, isNotNull, isNull, type SQL } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { gifts, type GiftRow, type NewGiftRow } from '@/db/gifts-schema';
import type { GiftStatus } from './gift-constants';

// Todo método recebe `coupleId` e o dono da lista. A exclusão é lógica (`is_active = false`).

function activeOfOwner(coupleId: string, ownerMemberId: string): SQL {
  const condition = and(
    eq(gifts.coupleId, coupleId),
    eq(gifts.ownerMemberId, ownerMemberId),
    eq(gifts.isActive, true),
  );
  if (!condition) throw new Error('Condição de presente vazia');
  return condition;
}

function activeGift(coupleId: string, ownerMemberId: string, giftId: string): SQL {
  const condition = and(activeOfOwner(coupleId, ownerMemberId), eq(gifts.id, giftId));
  if (!condition) throw new Error('Condição de presente vazia');
  return condition;
}

export async function listGiftsByStatus(
  coupleId: string,
  ownerMemberId: string,
  status: GiftStatus,
): Promise<GiftRow[]> {
  const isReceived = status === 'received';

  return getDatabase()
    .select()
    .from(gifts)
    .where(
      and(
        activeOfOwner(coupleId, ownerMemberId),
        isReceived ? isNotNull(gifts.receivedAt) : isNull(gifts.receivedAt),
      ),
    )
    .orderBy(isReceived ? desc(gifts.receivedAt) : asc(gifts.createdAt));
}

export async function findActiveGift(
  coupleId: string,
  ownerMemberId: string,
  giftId: string,
): Promise<GiftRow | null> {
  const [row] = await getDatabase()
    .select()
    .from(gifts)
    .where(activeGift(coupleId, ownerMemberId, giftId))
    .limit(1);
  return row ?? null;
}

export async function insertGift(data: NewGiftRow): Promise<GiftRow> {
  const [row] = await getDatabase().insert(gifts).values(data).returning();
  if (!row) throw new Error('Falha ao criar presente');
  return row;
}

export async function updateGift(
  coupleId: string,
  ownerMemberId: string,
  giftId: string,
  data: Partial<NewGiftRow>,
): Promise<GiftRow> {
  const [row] = await getDatabase()
    .update(gifts)
    .set(data)
    .where(activeGift(coupleId, ownerMemberId, giftId))
    .returning();
  if (!row) throw new Error('Falha ao atualizar presente');
  return row;
}

/** Só reserva se ninguém reservou: duas reservas ao mesmo tempo não se sobrescrevem. */
export async function reserveGift(gift: GiftRow, memberId: string): Promise<GiftRow | null> {
  const [row] = await getDatabase()
    .update(gifts)
    .set({ reservedByMemberId: memberId, reservedAt: new Date() })
    .where(
      and(activeGift(gift.coupleId, gift.ownerMemberId, gift.id), isNull(gifts.reservedByMemberId)),
    )
    .returning();
  return row ?? null;
}

/** Só quem reservou desfaz a reserva. */
export async function releaseGift(gift: GiftRow, memberId: string): Promise<void> {
  await getDatabase()
    .update(gifts)
    .set({ reservedByMemberId: null, reservedAt: null })
    .where(
      and(
        activeGift(gift.coupleId, gift.ownerMemberId, gift.id),
        eq(gifts.reservedByMemberId, memberId),
      ),
    );
}

export async function softDeleteGift(
  coupleId: string,
  ownerMemberId: string,
  giftId: string,
): Promise<boolean> {
  const deleted = await getDatabase()
    .update(gifts)
    .set({ isActive: false })
    .where(activeGift(coupleId, ownerMemberId, giftId))
    .returning({ id: gifts.id });
  return deleted.length > 0;
}
