import { Injectable } from '@nestjs/common';
import type {
  AgendaEvent,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { isUuid } from '../health/health.errors';
import { AgendaEventsRepository } from './agenda-events.repository';
import { agendaItemNotFound } from './agenda.errors';
import { toAgendaEvent } from './agenda.mappers';

@Injectable()
export class AgendaEventsService {
  constructor(private readonly repository: AgendaEventsRepository) {}

  async create(member: CurrentMemberContext, data: CreateAgendaEventRequest): Promise<AgendaEvent> {
    const row = await this.repository.create({ ...data, coupleId: member.coupleId });
    return toAgendaEvent(row);
  }

  async update(
    member: CurrentMemberContext,
    eventId: string,
    data: UpdateAgendaEventRequest,
  ): Promise<AgendaEvent> {
    await this.requireEvent(member.coupleId, eventId);

    const row = await this.repository.update(member.coupleId, eventId, data);
    return toAgendaEvent(row);
  }

  async remove(member: CurrentMemberContext, eventId: string): Promise<void> {
    await this.requireEvent(member.coupleId, eventId);

    const deleted = await this.repository.softDelete(member.coupleId, eventId);
    if (!deleted) throw agendaItemNotFound();
  }

  private async requireEvent(coupleId: string, eventId: string): Promise<void> {
    if (!isUuid(eventId)) throw agendaItemNotFound();

    const row = await this.repository.findActive(coupleId, eventId);
    if (!row) throw agendaItemNotFound();
  }
}
