import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { CalendarDate } from '@vibru/shared';
import { DATABASE, type Database, type DatabaseTransaction } from '../../database/database.module';
import { tasks, type NewTaskRow, type TaskRow } from './task.entity';

/**
 * Único acesso à tabela `tasks`. Todo método de domínio recebe `coupleId`;
 * a exclusão é lógica (`is_active = false`).
 */
@Injectable()
export class TasksRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findActiveById(
    coupleId: string,
    taskId: string,
    tx?: DatabaseTransaction,
  ): Promise<TaskRow | null> {
    const client = tx ?? this.db;
    const result = await client
      .select()
      .from(tasks)
      .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
      .limit(1);

    return result[0] ?? null;
  }

  async listOpen(coupleId: string): Promise<TaskRow[]> {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.coupleId, coupleId), eq(tasks.isActive, true), isNull(tasks.completedAt)))
      .orderBy(asc(tasks.dueOn), asc(tasks.createdAt));
  }

  /**
   * Concluídas cuja data civil em São Paulo está em `[fromDate, toDateExclusive)`.
   * A comparação acontece no banco para não depender do fuso do processo.
   */
  async listCompletedBetweenDates(
    coupleId: string,
    fromDate: CalendarDate,
    toDateExclusive: CalendarDate,
  ): Promise<TaskRow[]> {
    return this.db
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

  async create(data: NewTaskRow, tx?: DatabaseTransaction): Promise<TaskRow> {
    const client = tx ?? this.db;
    const result = await client.insert(tasks).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar tarefa');
    return result[0];
  }

  async update(
    coupleId: string,
    taskId: string,
    data: Partial<NewTaskRow>,
    tx?: DatabaseTransaction,
  ): Promise<TaskRow> {
    const client = tx ?? this.db;
    const result = await client
      .update(tasks)
      .set(data)
      .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
      .returning();
    if (!result[0]) throw new Error('Tarefa não encontrada para atualizar');
    return result[0];
  }

  /**
   * Marca a conclusão somente se a tarefa ainda estiver aberta. O `WHERE`
   * condicional serializa duas conclusões simultâneas: a segunda não acha a
   * linha e o service responde conflito.
   */
  async completeIfOpen(
    coupleId: string,
    taskId: string,
    memberId: string,
    completedAt: Date,
    tx: DatabaseTransaction,
  ): Promise<TaskRow | null> {
    const result = await tx
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

    return result[0] ?? null;
  }

  async clearCompletion(
    coupleId: string,
    taskId: string,
    tx: DatabaseTransaction,
  ): Promise<TaskRow> {
    const result = await tx
      .update(tasks)
      .set({ completedAt: null, completedByMemberId: null, updatedAt: new Date() })
      .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
      .returning();
    if (!result[0]) throw new Error('Tarefa não encontrada para reabrir');
    return result[0];
  }

  async findGeneratedChild(
    coupleId: string,
    parentTaskId: string,
    tx: DatabaseTransaction,
  ): Promise<TaskRow | null> {
    const result = await tx
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

    return result[0] ?? null;
  }

  async hardDelete(coupleId: string, taskId: string, tx: DatabaseTransaction): Promise<void> {
    await tx.delete(tasks).where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId)));
  }

  async softDelete(coupleId: string, taskId: string): Promise<TaskRow | null> {
    const result = await this.db
      .update(tasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(tasks.coupleId, coupleId), eq(tasks.id, taskId), eq(tasks.isActive, true)))
      .returning();

    return result[0] ?? null;
  }
}
