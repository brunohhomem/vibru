'use server';

import { addCalendarDays, startOfWeek } from '@/features/tasks/recurrence';
import { todayInSaoPaulo } from '@vibru/shared';
import { z } from 'zod';
import { getDatabase } from '@/db/client';
import type { NewTaskRow, TaskRow } from '@/db/tasks-schema';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { consumeDose, returnDose } from '@/features/health/medication-stock-operations';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import {
  clearTaskCompletion,
  completeTaskIfOpen,
  findActiveTaskById,
  findOpenGeneratedChild,
  hardDeleteTask,
  insertTask,
  listOpenTasks,
  listTasksCompletedBetween,
  softDeleteTask,
  updateTask,
} from './tasks-repository';
import {
  buildNextOccurrence,
  changesMedicationLockedFields,
  findTaskInputIssue,
  isUntouchedChild,
  resolveDueTime,
  resolveRecurrenceAnchor,
  toTask,
} from './task-rules';
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
  type CompleteTaskResponse,
  type Task,
  type TasksResponse,
} from './task-schemas';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAYS_PER_WEEK = 7;
const NO_RECURRENCE = { kind: 'none', interval: 1 } as const;

const taskIdSchema = z.object({ id: z.string() });
const updateTaskSchema = z.object({ id: z.string(), patch: updateTaskRequestSchema });

async function findTaskOrFail(coupleId: string, taskId: string): Promise<TaskRow> {
  const row = UUID_PATTERN.test(taskId) ? await findActiveTaskById(coupleId, taskId) : null;
  if (!row) throw new ActionFailure('failed', 'Tarefa não encontrada');
  return row;
}

async function assertAssigneeBelongsToCouple(
  coupleId: string,
  assigneeMemberId: string | null | undefined,
): Promise<void> {
  if (!assigneeMemberId) return;

  const members = await findCoupleMembers(coupleId);
  if (members.some((member) => member.id === assigneeMemberId)) return;
  throw new ActionFailure(
    'invalid_input',
    'Responsável não é membro deste casal',
    'assigneeMemberId',
  );
}

function failOnInputIssue(issue: ReturnType<typeof findTaskInputIssue>): void {
  if (issue) throw new ActionFailure('invalid_input', issue.message, issue.field);
}

export const listTasksAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<TasksResponse> => {
    const today = todayInSaoPaulo(new Date());
    const weekStartsOn = startOfWeek(today);
    const [open, completedThisWeek] = await Promise.all([
      listOpenTasks(member.coupleId),
      listTasksCompletedBetween(
        member.coupleId,
        weekStartsOn,
        addCalendarDays(weekStartsOn, DAYS_PER_WEEK),
      ),
    ]);

    return {
      today,
      weekStartsOn,
      open: open.map(toTask),
      completedThisWeek: completedThisWeek.map(toTask),
    };
  },
});

export const createTaskAction = defineMemberAction({
  schema: createTaskRequestSchema,
  handler: async ({ input, member }): Promise<Task> => {
    const recurrence = input.recurrence ?? NO_RECURRENCE;
    failOnInputIssue(
      findTaskInputIssue({
        dueOn: input.dueOn ?? null,
        dueTime: input.dueTime ?? null,
        recurrenceKind: recurrence.kind,
      }),
    );
    await assertAssigneeBelongsToCouple(member.coupleId, input.assigneeMemberId);

    const row = await insertTask({
      coupleId: member.coupleId,
      title: input.title,
      notes: input.notes ?? null,
      assigneeMemberId: input.assigneeMemberId,
      dueOn: input.dueOn ?? null,
      dueTime: input.dueTime ?? null,
      category: input.category ?? 'other',
      recurrenceKind: recurrence.kind,
      recurrenceInterval: recurrence.interval,
      recurrenceAnchorOn: recurrence.kind === 'none' ? null : (input.dueOn ?? null),
    });
    return toTask(row);
  },
});

export const updateTaskAction = defineMemberAction({
  schema: updateTaskSchema,
  handler: async ({ input, member }): Promise<Task> => {
    const { patch } = input;
    const existing = await findTaskOrFail(member.coupleId, input.id);
    if (existing.medicationId && changesMedicationLockedFields(patch)) {
      throw new ActionFailure('failed', 'Tarefa de remédio só muda pelo remédio');
    }
    await assertAssigneeBelongsToCouple(member.coupleId, patch.assigneeMemberId);

    const recurrence = patch.recurrence ?? {
      kind: existing.recurrenceKind,
      interval: existing.recurrenceInterval,
    };
    const dueOn = patch.dueOn !== undefined ? patch.dueOn : existing.dueOn;
    const dueTime = resolveDueTime(existing.dueTime, patch.dueTime, dueOn);
    failOnInputIssue(findTaskInputIssue({ dueOn, dueTime, recurrenceKind: recurrence.kind }));

    const changes: Partial<NewTaskRow> = {
      recurrenceKind: recurrence.kind,
      recurrenceInterval: recurrence.interval,
      recurrenceAnchorOn: resolveRecurrenceAnchor(
        { kind: existing.recurrenceKind, anchorOn: existing.recurrenceAnchorOn },
        patch,
        recurrence.kind,
        dueOn,
      ),
      dueTime,
    };
    if (patch.category !== undefined) changes.category = patch.category;
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.notes !== undefined) changes.notes = patch.notes;
    if (patch.assigneeMemberId !== undefined) changes.assigneeMemberId = patch.assigneeMemberId;
    if (patch.dueOn !== undefined) changes.dueOn = patch.dueOn;

    return toTask(await updateTask(member.coupleId, input.id, changes));
  },
});

export const completeTaskAction = defineMemberAction({
  schema: taskIdSchema,
  handler: async ({ input, member }): Promise<CompleteTaskResponse> => {
    await findTaskOrFail(member.coupleId, input.id);

    const now = new Date();
    const result = await getDatabase().transaction(async (transaction) => {
      const completed = await completeTaskIfOpen(
        member.coupleId,
        input.id,
        member.memberId,
        now,
        transaction,
      );
      if (!completed) throw new ActionFailure('failed', 'Tarefa já concluída');

      const lowStock = completed.medicationId
        ? await consumeDose(member.coupleId, completed.medicationId, transaction)
        : null;
      const nextData = buildNextOccurrence(completed, todayInSaoPaulo(now));
      const next = nextData ? await insertTask(nextData, transaction) : null;
      return { completed, next, lowStock };
    });

    return {
      completed: toTask(result.completed),
      next: result.next ? toTask(result.next) : null,
      lowStock: result.lowStock,
    };
  },
});

export const reopenTaskAction = defineMemberAction({
  schema: taskIdSchema,
  handler: async ({ input, member }): Promise<Task> => {
    const existing = await findTaskOrFail(member.coupleId, input.id);
    if (!existing.completedAt) throw new ActionFailure('failed', 'Tarefa não está concluída');

    const reopened = await getDatabase().transaction(async (transaction) => {
      const row = await clearTaskCompletion(member.coupleId, input.id, transaction);
      if (existing.medicationId) {
        await returnDose(member.coupleId, existing.medicationId, transaction);
      }
      const child = await findOpenGeneratedChild(member.coupleId, input.id, transaction);
      if (child && isUntouchedChild(child)) {
        await hardDeleteTask(member.coupleId, child.id, transaction);
      }
      return row;
    });
    return toTask(reopened);
  },
});

export const removeTaskAction = defineMemberAction({
  schema: taskIdSchema,
  handler: async ({ input, member }): Promise<null> => {
    const existing = await findTaskOrFail(member.coupleId, input.id);
    if (existing.medicationId) {
      throw new ActionFailure('failed', 'Tarefa de remédio só muda pelo remédio');
    }

    const deleted = await softDeleteTask(member.coupleId, input.id);
    if (!deleted) throw new ActionFailure('failed', 'Tarefa não encontrada');
    return null;
  },
});
