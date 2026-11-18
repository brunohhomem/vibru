import { and, asc, desc, eq, getTableColumns, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import { agendaEvents } from '@/db/agenda-schema';
import { getDatabase } from '@/db/client';
import { wishes, type NewWishRow, type WishRow } from '@/db/wishes-schema';
import type { WishStatus } from './wish-constants';
import type { WishWithPlan } from './wish-mappers';

// Todo método recebe `coupleId`. A exclusão é lógica (`is_active = false`).

function activeOfCouple(coupleId: string): SQL {
  const condition = and(eq(wishes.coupleId, coupleId), eq(wishes.isActive, true));
  if (!condition) throw new Error('Condição de desejo vazia');
  return condition;
}

/**
 * `plannedOn`: o dia mais próximo, de hoje em diante, entre os eventos ativos do desejo.
 * Os nomes vão qualificados à mão: dentro de um select de uma tabela só, o Drizzle escreve
 * a coluna sem a tabela, e `"wish_id" = "id"` compararia duas colunas de `events`.
 */
function selectWithPlan(today: string) {
  const plannedOn = sql<string | null>`(
    select min("events"."starts_on")::text
    from ${agendaEvents}
    where "events"."wish_id" = "wishes"."id"
      and "events"."is_active" = true
      and "events"."starts_on" >= ${today}
  )`;

  return getDatabase()
    .select({ ...getTableColumns(wishes), plannedOn })
    .from(wishes)
    .$dynamic();
}

export async function listWishesByStatus(
  coupleId: string,
  status: WishStatus,
  today: string,
): Promise<WishWithPlan[]> {
  const isDone = status === 'done';

  return selectWithPlan(today)
    .where(and(activeOfCouple(coupleId), isDone ? isNotNull(wishes.doneAt) : isNull(wishes.doneAt)))
    .orderBy(isDone ? desc(wishes.doneAt) : asc(wishes.createdAt));
}

export async function findActiveWish(
  coupleId: string,
  wishId: string,
  today: string,
): Promise<WishWithPlan | null> {
  const [row] = await selectWithPlan(today)
    .where(and(activeOfCouple(coupleId), eq(wishes.id, wishId)))
    .limit(1);
  return row ?? null;
}

export async function insertWish(data: NewWishRow): Promise<WishRow> {
  const [row] = await getDatabase().insert(wishes).values(data).returning();
  if (!row) throw new Error('Falha ao criar desejo');
  return row;
}

export async function updateWish(
  coupleId: string,
  wishId: string,
  data: Partial<NewWishRow>,
): Promise<void> {
  await getDatabase()
    .update(wishes)
    .set(data)
    .where(and(activeOfCouple(coupleId), eq(wishes.id, wishId)));
}

export async function softDeleteWish(coupleId: string, wishId: string): Promise<boolean> {
  const deleted = await getDatabase()
    .update(wishes)
    .set({ isActive: false })
    .where(and(activeOfCouple(coupleId), eq(wishes.id, wishId)))
    .returning({ id: wishes.id });
  return deleted.length > 0;
}
