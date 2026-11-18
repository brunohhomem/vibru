import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { getDatabase, type DatabaseExecutor } from '@/db/client';
import { tasks, type NewTaskRow, type TaskRow } from '@/db/tasks-schema';
import type { CalendarDate } from '@/lib/calendar-date';

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
  executor: DatabaseExecutor = getDatabase(),
): Promise<TaskRow> {
  const [row] = await executor
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

/**
 * Reabre somente se a tarefa ainda estiver concluída. O `WHERE` condicional serializa duas
 * reaberturas simultâneas: a segunda não acha a linha e a action responde conflito, em vez
 * de devolver a dose do remédio duas vezes.
 */
export async function clearTaskCompletion(
  coupleId: string,
  taskId: string,
  executor: DatabaseExecutor,
): Promise<TaskRow | null> {
  const [row] = await executor
    .update(tasks)
    .set({ completedAt: null, completedByMemberId: null, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.coupleId, coupleId),
        eq(tasks.id, taskId),
        eq(tasks.isActive, true),
        isNotNull(tasks.completedAt),
      ),
    )
    .returning();
  return row ?? null;
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

/** Tarefas abertas geradas por um remédio, por horário. */
export async function listOpenTasksByMedication(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<TaskRow[]> {
  return executor
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.coupleId, coupleId),
        eq(tasks.medicationId, medicationId),
        eq(tasks.isActive, true),
        isNull(tasks.completedAt),
      ),
    )
    .orderBy(asc(tasks.dueTime), asc(tasks.createdAt));
}

export async function softDeleteTasks(
  coupleId: string,
  taskIds: string[],
  executor: DatabaseExecutor,
): Promise<void> {
  if (taskIds.length === 0) return;

  await executor
    .update(tasks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(tasks.coupleId, coupleId), inArray(tasks.id, taskIds)));
}

export async function softDeleteTask(coupleId: string, taskId: string): Promise<TaskRow | null> {
  const [row] = await getDatabase()
    .update(tasks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
    .returning();
  return row ?? null;
}
