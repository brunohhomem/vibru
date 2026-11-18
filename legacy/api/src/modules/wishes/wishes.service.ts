import { Injectable } from '@nestjs/common';
import {
  todayInSaoPaulo,
  type AgendaEvent,
  type CreateWishRequest,
  type PlanWishRequest,
  type UpdateWishRequest,
  type Wish,
  type WishStatus,
  type WishesResponse,
} from '@vibru/shared';
import { AgendaEventsService } from '../agenda/agenda-events.service';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { isUuid } from '../health/health.errors';
import { OgImageService } from '../link-preview/og-image.service';
import { toWish } from './wish.mapper';
import { WishesRepository, type WishWithPlan } from './wishes.repository';
import { wishNotFound } from './wishes.errors';

function today(): string {
  return todayInSaoPaulo(new Date());
}

@Injectable()
export class WishesService {
  constructor(
    private readonly repository: WishesRepository,
    private readonly ogImage: OgImageService,
    private readonly agendaEvents: AgendaEventsService,
  ) {}

  async list(member: CurrentMemberContext, status: WishStatus): Promise<WishesResponse> {
    const rows = await this.repository.listByStatus(member.coupleId, status, today());
    return { wishes: rows.map(toWish) };
  }

  async create(member: CurrentMemberContext, data: CreateWishRequest): Promise<Wish> {
    const imageUrl = data.imageUrl ?? (data.url ? await this.ogImage.findImageUrl(data.url) : null);
    const row = await this.repository.create({ ...data, imageUrl, coupleId: member.coupleId });
    return this.reload(member.coupleId, row.id);
  }

  async update(
    member: CurrentMemberContext,
    wishId: string,
    data: UpdateWishRequest,
  ): Promise<Wish> {
    const current = await this.requireWish(member.coupleId, wishId);
    const imageUrl = await this.nextImageUrl(current, data);

    await this.repository.update(member.coupleId, wishId, { ...data, imageUrl });
    return this.reload(member.coupleId, wishId);
  }

  async setDone(member: CurrentMemberContext, wishId: string, done: boolean): Promise<Wish> {
    await this.requireWish(member.coupleId, wishId);

    await this.repository.update(member.coupleId, wishId, { doneAt: done ? new Date() : null });
    return this.reload(member.coupleId, wishId);
  }

  async plan(
    member: CurrentMemberContext,
    wishId: string,
    data: PlanWishRequest,
  ): Promise<AgendaEvent> {
    const wish = await this.requireWish(member.coupleId, wishId);
    return this.agendaEvents.createForWish(member, wish, data);
  }

  async remove(member: CurrentMemberContext, wishId: string): Promise<void> {
    await this.requireWish(member.coupleId, wishId);

    await this.agendaEvents.detachWish(member.coupleId, wishId);
    const deleted = await this.repository.softDelete(member.coupleId, wishId);
    if (!deleted) throw wishNotFound();
  }

  /**
   * A imagem informada à mão vence. Sem ela, só uma URL nova dispara a busca
   * do `og:image`; apagar a URL apaga a imagem; não mexer na URL mantém tudo.
   */
  private async nextImageUrl(
    current: WishWithPlan,
    data: UpdateWishRequest,
  ): Promise<string | null | undefined> {
    if (data.imageUrl !== undefined) return data.imageUrl;
    if (data.url === undefined || data.url === current.url) return undefined;
    if (data.url === null) return null;
    return this.ogImage.findImageUrl(data.url);
  }

  private async requireWish(coupleId: string, wishId: string): Promise<WishWithPlan> {
    if (!isUuid(wishId)) throw wishNotFound();

    const row = await this.repository.findActive(coupleId, wishId, today());
    if (!row) throw wishNotFound();
    return row;
  }

  private async reload(coupleId: string, wishId: string): Promise<Wish> {
    return toWish(await this.requireWish(coupleId, wishId));
  }
}
