import { Injectable } from '@nestjs/common';
import type {
  CreateGiftRequest,
  GiftResponse,
  GiftStatus,
  GiftsResponse,
  UpdateGiftRequest,
} from '@vibru/shared';
import { CoupleRepository } from '../couple/couple.repository';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { isUuid } from '../health/health.errors';
import { OgImageService } from '../link-preview/og-image.service';
import type { GiftRow } from './gift.entity';
import { toGiftResponse } from './gift.mapper';
import {
  giftAlreadyReserved,
  giftNotFound,
  giftNotOwner,
  giftSelfReservation,
} from './gifts.errors';
import { GiftsRepository } from './gifts.repository';

@Injectable()
export class GiftsService {
  constructor(
    private readonly repository: GiftsRepository,
    private readonly coupleRepository: CoupleRepository,
    private readonly ogImage: OgImageService,
  ) {}

  async list(
    member: CurrentMemberContext,
    ownerId: string,
    status: GiftStatus,
  ): Promise<GiftsResponse> {
    await this.requireOwnerInCouple(member.coupleId, ownerId);

    const rows = await this.repository.listByStatus(member.coupleId, ownerId, status);
    return { gifts: rows.map((row) => toGiftResponse(row, member.memberId)) };
  }

  async create(
    member: CurrentMemberContext,
    ownerId: string,
    data: CreateGiftRequest,
  ): Promise<GiftResponse> {
    await this.requireOwnerInCouple(member.coupleId, ownerId);
    if (member.memberId !== ownerId) throw giftNotOwner();

    const imageUrl = data.imageUrl ?? (data.url ? await this.ogImage.findImageUrl(data.url) : null);
    const row = await this.repository.create({
      ...data,
      imageUrl,
      coupleId: member.coupleId,
      ownerMemberId: ownerId,
    });
    return toGiftResponse(row, member.memberId);
  }

  async update(
    member: CurrentMemberContext,
    ownerId: string,
    giftId: string,
    data: UpdateGiftRequest,
  ): Promise<GiftResponse> {
    const gift = await this.requireOwnGift(member, ownerId, giftId);
    const imageUrl = await this.nextImageUrl(gift, data);

    const row = await this.repository.update(member.coupleId, ownerId, giftId, {
      ...data,
      imageUrl,
    });
    return toGiftResponse(row, member.memberId);
  }

  async markReceived(
    member: CurrentMemberContext,
    ownerId: string,
    giftId: string,
  ): Promise<GiftResponse> {
    await this.requireOwnGift(member, ownerId, giftId);

    const row = await this.repository.update(member.coupleId, ownerId, giftId, {
      receivedAt: new Date(),
    });
    return toGiftResponse(row, member.memberId);
  }

  async remove(member: CurrentMemberContext, ownerId: string, giftId: string): Promise<void> {
    await this.requireOwnGift(member, ownerId, giftId);

    const deleted = await this.repository.softDelete(member.coupleId, ownerId, giftId);
    if (!deleted) throw giftNotFound();
  }

  async reserve(
    member: CurrentMemberContext,
    ownerId: string,
    giftId: string,
  ): Promise<GiftResponse> {
    const gift = await this.requireGift(member.coupleId, ownerId, giftId);
    if (gift.ownerMemberId === member.memberId) throw giftSelfReservation();

    const reserved = await this.repository.reserve(gift, member.memberId);
    if (!reserved) throw giftAlreadyReserved();
    return toGiftResponse(reserved, member.memberId);
  }

  /** Só quem reservou desfaz; o dono recebe o mesmo 422 de quem tenta reservar a própria lista. */
  async release(
    member: CurrentMemberContext,
    ownerId: string,
    giftId: string,
  ): Promise<GiftResponse> {
    const gift = await this.requireGift(member.coupleId, ownerId, giftId);
    if (gift.ownerMemberId === member.memberId) throw giftSelfReservation();

    await this.repository.release(gift, member.memberId);
    return toGiftResponse(
      await this.requireGift(member.coupleId, ownerId, giftId),
      member.memberId,
    );
  }

  /** Mesma regra dos desejos: imagem manual vence; só URL nova dispara a busca. */
  private async nextImageUrl(
    gift: GiftRow,
    data: UpdateGiftRequest,
  ): Promise<string | null | undefined> {
    if (data.imageUrl !== undefined) return data.imageUrl;
    if (data.url === undefined || data.url === gift.url) return undefined;
    if (data.url === null) return null;
    return this.ogImage.findImageUrl(data.url);
  }

  private async requireOwnerInCouple(coupleId: string, ownerId: string): Promise<void> {
    if (!isUuid(ownerId)) throw giftNotFound();

    const owner = await this.coupleRepository.findMember(coupleId, ownerId);
    if (!owner) throw giftNotFound();
  }

  private async requireGift(coupleId: string, ownerId: string, giftId: string): Promise<GiftRow> {
    await this.requireOwnerInCouple(coupleId, ownerId);
    if (!isUuid(giftId)) throw giftNotFound();

    const gift = await this.repository.findActive(coupleId, ownerId, giftId);
    if (!gift) throw giftNotFound();
    return gift;
  }

  private async requireOwnGift(
    member: CurrentMemberContext,
    ownerId: string,
    giftId: string,
  ): Promise<GiftRow> {
    const gift = await this.requireGift(member.coupleId, ownerId, giftId);
    if (gift.ownerMemberId !== member.memberId) throw giftNotOwner();
    return gift;
  }
}
