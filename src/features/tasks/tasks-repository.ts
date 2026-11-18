import type { CalendarDate } from '@vibru/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDatabase, type DatabaseExecutor } from '@/db/client';
import { tasks, type NewTaskRow, type TaskRow } from '@/db/tasks-schema';

// Todo método recebe `coupleId`: um membro nunca lê nem grava tarefa de outro casal.
// A exclusão é lógica (`is_active = false`).

export async function findActiveTaskById(
  coupleId: string,
  taskId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<TaskRow | null> {
  const [row] = await executor
    .select()
    .from(tasks)
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function listOpenTasks(coupleId: string): Promise<TaskRow[]> {
  return getDatabase()
    .select()
    .from(tasks)
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.isActive, true), isNull(tasks.completedAt)))
    .orderBy(asc(tasks.dueOn), asc(tasks.dueTime), asc(tasks.createdAt));
}

/**
 * Concluídas cuja data civil em São Paulo está em `[fromDate, toDateExclusive)`.
 * A comparação acontece no banco para não depender do fuso do processo.
 */
export async function listTasksCompletedBetween(
  coupleId: string,
  fromDate: CalendarDate,
  toDateExclusive: CalendarDate,
): Promise<TaskRow[]> {
  return getDatabase()
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.coupleId, coupleId),
        eq(tasks.isActive, true),
        sql`(${tasks.completedAt} AT TIME ZONE 'America/Sao_Paulo')::date >= ${fromDate}::date`,
        sql`(${tasks.completedAt} AT TIME ZONE 'America/Sao_Paulo')::date < ${toDateExclusive}::date`,
      ),
    )
    .orderBy(desc(tasks.completedAt));
}

export async function insertTask(
  data: NewTaskRow,
  executor: DatabaseExecutor = getDatabase(),
): Promise<TaskRow> {
  const [row] = await executor.insert(tasks).values(data).returning();
  if (!row) throw new Error('Falha ao criar tarefa');
  return row;
}

export async function updateTask(
  coupleId: string,
  taskId: string,
  data: Partial<NewTaskRow>,
): Promise<TaskRow> {
  const [row] = await getDatabase()
    .update(tasks)
    .set(data)
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
    .returning();
  if (!row) throw new Error('Tarefa não encontrada para atualizar');
  return row;
}

/**
 * Marca a conclusão somente se a tarefa ainda estiver aberta. O `WHERE` condicional
 * serializa duas conclusões simultâneas: a segunda não acha a linha e a action responde conflito.
 */
export async function completeTaskIfOpen(
  coupleId: string,
  taskId: string,
  memberId: string,
  completedAt: Date,
  executor: DatabaseExecutor,
): Promise<TaskRow | null> {
  const [row] = await executor
    .update(tasks)
    .set({ completedAt, completedByMemberId: memberId, updatedAt: completedAt })
    .where(
      and(
        eq(tasks.coupleId, coupleId),
        eq(tasks.id, taskId),
        eq(tasks.isActive, true),
        isNull(tasks.completedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function clearTaskCompletion(
  coupleId: string,
  taskId: string,
  executor: DatabaseExecutor,
): Promise<TaskRow> {
  const [row] = await executor
    .update(tasks)
    .set({ completedAt: null, completedByMemberId: null, updatedAt: new Date() })
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
    .returning();
  if (!row) throw new Error('Tarefa não encontrada para reabrir');
  return row;
}

export async function findOpenGeneratedChild(
  coupleId: string,
  parentTaskId: string,
  executor: DatabaseExecutor,
): Promise<TaskRow | null> {
  const [row] = await executor
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.coupleId, coupleId),
        eq(tasks.generatedFromTaskId, parentTaskId),
        eq(tasks.isActive, true),
        isNull(tasks.completedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function hardDeleteTask(
  coupleId: string,
  taskId: string,
  executor: DatabaseExecutor,
): Promise<void> {
  await executor.delete(tasks).where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId)));
}

export async function softDeleteTask(coupleId: string, taskId: string): Promise<TaskRow | null> {
  const [row] = await getDatabase()
    .update(tasks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
    .returning();
  return row ?? null;
}
