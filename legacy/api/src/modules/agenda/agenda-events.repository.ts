import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { agendaEvents, type AgendaEventRow, type NewAgendaEventRow } from './agenda.entity';

/** Único acesso à tabela `events`. Todo método recebe `coupleId`. */
@Injectable()
export class AgendaEventsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listBetween(coupleId: string, from: string, to: string): Promise<AgendaEventRow[]> {
    return this.db
      .select()
      .from(agendaEvents)
      .where(
        and(
          this.activeOfCouple(coupleId),
          gte(agendaEvents.startsOn, from),
          lte(agendaEvents.startsOn, to),
        ),
      )
      .orderBy(asc(agendaEvents.startsOn), asc(agendaEvents.startTime));
  }

  async findActive(coupleId: string, eventId: string): Promise<AgendaEventRow | null> {
    const result = await this.db
      .select()
      .from(agendaEvents)
      .where(and(this.activeOfCouple(coupleId), eq(agendaEvents.id, eventId)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewAgendaEventRow): Promise<AgendaEventRow> {
    const result = await this.db.insert(agendaEvents).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar evento');
    return result[0];
  }

  async update(
    coupleId: string,
    eventId: string,
    data: Partial<NewAgendaEventRow>,
  ): Promise<AgendaEventRow> {
    const result = await this.db
      .update(agendaEvents)
      .set(data)
      .where(and(this.activeOfCouple(coupleId), eq(agendaEvents.id, eventId)))
      .returning();
    if (!result[0]) throw new Error('Falha ao atualizar evento');
    return result[0];
  }

  async softDelete(coupleId: string, eventId: string): Promise<boolean> {
    const result = await this.db
      .update(agendaEvents)
      .set({ isActive: false })
      .where(and(this.activeOfCouple(coupleId), eq(agendaEvents.id, eventId)))
      .returning({ id: agendaEvents.id });

    return result.length > 0;
  }

  /** O desejo some em soft delete, então a FK `set null` não dispara: o vínculo sai aqui. */
  async detachWish(coupleId: string, wishId: string): Promise<void> {
    await this.db
      .update(agendaEvents)
      .set({ wishId: null })
      .where(and(eq(agendaEvents.coupleId, coupleId), eq(agendaEvents.wishId, wishId)));
  }

  private activeOfCouple(coupleId: string) {
    return and(eq(agendaEvents.coupleId, coupleId), eq(agendaEvents.isActive, true));
  }
}
