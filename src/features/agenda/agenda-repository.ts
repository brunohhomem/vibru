import { and, asc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { agendaEvents, type AgendaEventRow, type NewAgendaEventRow } from '@/db/agenda-schema';

// Todo método recebe `coupleId`. A exclusão é lógica (`is_active = false`).

function activeOfCouple(coupleId: string): SQL {
  const condition = and(eq(agendaEvents.coupleId, coupleId), eq(agendaEvents.isActive, true));
  if (!condition) throw new Error('Condição de evento vazia');
  return condition;
}

function activeEvent(coupleId: string, eventId: string): SQL {
  const condition = and(activeOfCouple(coupleId), eq(agendaEvents.id, eventId));
  if (!condition) throw new Error('Condição de evento vazia');
  return condition;
}

export async function listEventsBetween(
  coupleId: string,
  from: string,
  to: string,
): Promise<AgendaEventRow[]> {
  return getDatabase()
    .select()
    .from(agendaEvents)
    .where(
      and(
        activeOfCouple(coupleId),
        gte(agendaEvents.startsOn, from),
        lte(agendaEvents.startsOn, to),
      ),
    )
    .orderBy(asc(agendaEvents.startsOn), asc(agendaEvents.startTime));
}

export async function findActiveEvent(
  coupleId: string,
  eventId: string,
): Promise<AgendaEventRow | null> {
  const [row] = await getDatabase()
    .select()
    .from(agendaEvents)
    .where(activeEvent(coupleId, eventId))
    .limit(1);
  return row ?? null;
}

export async function insertEvent(data: NewAgendaEventRow): Promise<AgendaEventRow> {
  const [row] = await getDatabase().insert(agendaEvents).values(data).returning();
  if (!row) throw new Error('Falha ao criar evento');
  return row;
}

export async function updateEvent(
  coupleId: string,
  eventId: string,
  data: Partial<NewAgendaEventRow>,
): Promise<AgendaEventRow> {
  const [row] = await getDatabase()
    .update(agendaEvents)
    .set(data)
    .where(activeEvent(coupleId, eventId))
    .returning();
  if (!row) throw new Error('Falha ao atualizar evento');
  return row;
}

export async function softDeleteEvent(coupleId: string, eventId: string): Promise<boolean> {
  const deleted = await getDatabase()
    .update(agendaEvents)
    .set({ isActive: false })
    .where(activeEvent(coupleId, eventId))
    .returning({ id: agendaEvents.id });
  return deleted.length > 0;
}

/** O desejo some em exclusão lógica, então a FK `set null` não dispara: o vínculo sai aqui. */
export async function detachWishFromEvents(coupleId: string, wishId: string): Promise<void> {
  await getDatabase()
    .update(agendaEvents)
    .set({ wishId: null })
    .where(and(eq(agendaEvents.coupleId, coupleId), eq(agendaEvents.wishId, wishId)));
}
