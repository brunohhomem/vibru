import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { GiftStatus } from '@vibru/shared';
import { DATABASE, type Database } from '../../database/database.module';
import { gifts, type GiftRow, type NewGiftRow } from './gift.entity';

/** Único acesso à tabela `gifts`. Todo método recebe `coupleId` e o dono da lista. */
@Injectable()
export class GiftsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByStatus(
    coupleId: string,
    ownerMemberId: string,
    status: GiftStatus,
  ): Promise<GiftRow[]> {
    const isReceived = status === 'received';

    return this.db
      .select()
      .from(gifts)
      .where(
        and(
          this.activeOfOwner(coupleId, ownerMemberId),
          isReceived ? isNotNull(gifts.receivedAt) : isNull(gifts.receivedAt),
        ),
      )
      .orderBy(isReceived ? desc(gifts.receivedAt) : asc(gifts.createdAt));
  }

  async findActive(
    coupleId: string,
    ownerMemberId: string,
    giftId: string,
  ): Promise<GiftRow | null> {
    const result = await this.db
      .select()
      .from(gifts)
      .where(and(this.activeOfOwner(coupleId, ownerMemberId), eq(gifts.id, giftId)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewGiftRow): Promise<GiftRow> {
    const result = await this.db.insert(gifts).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar presente');
    return result[0];
  }

  async update(
    coupleId: string,
    ownerMemberId: string,
    giftId: string,
    data: Partial<NewGiftRow>,
  ): Promise<GiftRow> {
    const result = await this.db
      .update(gifts)
      .set(data)
      .where(and(this.activeOfOwner(coupleId, ownerMemberId), eq(gifts.id, giftId)))
      .returning();
    if (!result[0]) throw new Error('Falha ao atualizar presente');
    return result[0];
  }

  /** Só reserva se ninguém reservou: duas reservas ao mesmo tempo não se sobrescrevem. */
  async reserve(gift: GiftRow, memberId: string): Promise<GiftRow | null> {
    const result = await this.db
      .update(gifts)
      .set({ reservedByMemberId: memberId, reservedAt: new Date() })
      .where(
        and(
          this.activeOfOwner(gift.coupleId, gift.ownerMemberId),
          eq(gifts.id, gift.id),
          isNull(gifts.reservedByMemberId),
        ),
      )
      .returning();

    return result[0] ?? null;
  }

  async release(gift: GiftRow, memberId: string): Promise<void> {
    await this.db
      .update(gifts)
      .set({ reservedByMemberId: null, reservedAt: null })
      .where(
        and(
          this.activeOfOwner(gift.coupleId, gift.ownerMemberId),
          eq(gifts.id, gift.id),
          eq(gifts.reservedByMemberId, memberId),
        ),
      );
  }

  async softDelete(coupleId: string, ownerMemberId: string, giftId: string): Promise<boolean> {
    const result = await this.db
      .update(gifts)
      .set({ isActive: false })
      .where(and(this.activeOfOwner(coupleId, ownerMemberId), eq(gifts.id, giftId)))
      .returning({ id: gifts.id });

    return result.length > 0;
  }

  private activeOfOwner(coupleId: string, ownerMemberId: string) {
    return and(
      eq(gifts.coupleId, coupleId),
      eq(gifts.ownerMemberId, ownerMemberId),
      eq(gifts.isActive, true),
    );
  }
}
