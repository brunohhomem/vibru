import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TASK_ERROR_CODES,
  addCalendarDays,
  nextRecurrence,
  startOfWeek,
  todayInSaoPaulo,
  type CreateTaskRequest,
  type Task,
  type TaskRecurrence,
  type TasksResponse,
  type UpdateTaskRequest,
} from '@vibru/shared';
import { DATABASE, type Database, type DatabaseTransaction } from '../../database/database.module';
import { CoupleRepository } from '../couple/couple.repository';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { TasksRepository } from './tasks.repository';
import type { NewTaskRow, TaskRow } from './task.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CompleteTaskResult = {
  completed: Task;
  next: Task | null;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly coupleRepository: CoupleRepository,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async list(member: CurrentMemberContext): Promise<TasksResponse> {
    const today = todayInSaoPaulo(new Date());
    const weekStartsOn = startOfWeek(today);
    const nextWeek = addCalendarDays(weekStartsOn, 7);

    const [open, completedThisWeek] = await Promise.all([
      this.tasksRepository.listOpen(member.coupleId),
      this.tasksRepository.listCompletedBetweenDates(member.coupleId, weekStartsOn, nextWeek),
    ]);

    return {
      today,
      weekStartsOn,
      open: open.map(toTask),
      completedThisWeek: completedThisWeek.map(toTask),
    };
  }

  async create(member: CurrentMemberContext, data: CreateTaskRequest): Promise<Task> {
    const recurrence = data.recurrence ?? { kind: 'none' as const, interval: 1 };
    if (recurrence.kind !== 'none' && !data.dueOn) throw this.recurrenceWithoutDueDate();

    await this.assertAssigneeBelongsToCouple(member.coupleId, data.assigneeMemberId);

    const row = await this.tasksRepository.create({
      coupleId: member.coupleId,
      title: data.title,
      notes: data.notes ?? null,
      assigneeMemberId: data.assigneeMemberId,
      dueOn: data.dueOn ?? null,
      recurrenceKind: recurrence.kind,
      recurrenceInterval: recurrence.interval,
      recurrenceAnchorOn: recurrence.kind === 'none' ? null : (data.dueOn ?? null),
    });

    return toTask(row);
  }

  async update(
    member: CurrentMemberContext,
    taskId: string,
    data: UpdateTaskRequest,
  ): Promise<Task> {
    const existing = await this.findOrThrow(member.coupleId, taskId);

    if (data.assigneeMemberId !== undefined && data.assigneeMemberId !== null) {
      await this.assertAssigneeBelongsToCouple(member.coupleId, data.assigneeMemberId);
    }

    const recurrence = data.recurrence ?? {
      kind: existing.recurrenceKind,
      interval: existing.recurrenceInterval,
    };
    const dueOn = data.dueOn !== undefined ? data.dueOn : existing.dueOn;

    if (recurrence.kind !== 'none' && !dueOn) throw this.recurrenceWithoutDueDate();

    const updated = await this.tasksRepository.update(
      member.coupleId,
      taskId,
      this.buildUpdatePatch(existing, data, recurrence, dueOn),
    );

    return toTask(updated);
  }

  async complete(member: CurrentMemberContext, taskId: string): Promise<CompleteTaskResult> {
    await this.findOrThrow(member.coupleId, taskId);

    const now = new Date();
    const result = await this.db.transaction(async (tx) => {
      const completed = await this.tasksRepository.completeIfOpen(
        member.coupleId,
        taskId,
        member.memberId,
        now,
        tx,
      );

      if (!completed) throw this.alreadyCompleted();

      const next = await this.createNextOccurrence(completed, member.coupleId, now, tx);
      return { completed, next };
    });

    return {
      completed: toTask(result.completed),
      next: result.next ? toTask(result.next) : null,
    };
  }

  async reopen(member: CurrentMemberContext, taskId: string): Promise<Task> {
    const existing = await this.findOrThrow(member.coupleId, taskId);
    if (!existing.completedAt) throw this.notCompleted();

    const reopened = await this.db.transaction(async (tx) => {
      const row = await this.tasksRepository.clearCompletion(member.coupleId, taskId, tx);
      const child = await this.tasksRepository.findGeneratedChild(member.coupleId, taskId, tx);

      if (child && isUntouched(child)) {
        await this.tasksRepository.hardDelete(member.coupleId, child.id, tx);
      }

      return row;
    });

    return toTask(reopened);
  }

  async remove(member: CurrentMemberContext, taskId: string): Promise<void> {
    await this.findOrThrow(member.coupleId, taskId);
    const deleted = await this.tasksRepository.softDelete(member.coupleId, taskId);
    if (!deleted) throw this.notFound();
  }

  private async createNextOccurrence(
    completed: TaskRow,
    coupleId: string,
    now: Date,
    tx: DatabaseTransaction,
  ): Promise<TaskRow | null> {
    if (completed.recurrenceKind === 'none') return null;

    const anchor = completed.recurrenceAnchorOn;
    const currentDue = completed.dueOn;
    if (!anchor || !currentDue) throw new Error('Tarefa recorrente sem âncora ou prazo');

    const today = todayInSaoPaulo(now);
    const after = currentDue > today ? currentDue : today;
    const nextDue = nextRecurrence(
      anchor,
      completed.recurrenceKind,
      completed.recurrenceInterval,
      after,
    );

    return this.tasksRepository.create(
      {
        coupleId,
        title: completed.title,
        notes: completed.notes,
        assigneeMemberId: completed.assigneeMemberId,
        dueOn: nextDue,
        recurrenceKind: completed.recurrenceKind,
        recurrenceInterval: completed.recurrenceInterval,
        recurrenceAnchorOn: anchor,
        generatedFromTaskId: completed.id,
      },
      tx,
    );
  }

  private buildUpdatePatch(
    existing: TaskRow,
    data: UpdateTaskRequest,
    recurrence: { kind: TaskRecurrence; interval: number },
    dueOn: string | null,
  ): Partial<NewTaskRow> {
    const patch: Partial<NewTaskRow> = {
      recurrenceKind: recurrence.kind,
      recurrenceInterval: recurrence.interval,
      recurrenceAnchorOn: resolveAnchor(existing, data, recurrence, dueOn),
    };

    if (data.title !== undefined) patch.title = data.title;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.assigneeMemberId !== undefined) patch.assigneeMemberId = data.assigneeMemberId;
    if (data.dueOn !== undefined) patch.dueOn = data.dueOn;

    return patch;
  }

  private async findOrThrow(coupleId: string, taskId: string): Promise<TaskRow> {
    if (!UUID_PATTERN.test(taskId)) throw this.notFound();

    const row = await this.tasksRepository.findActiveById(coupleId, taskId);
    if (!row) throw this.notFound();

    return row;
  }

  private async assertAssigneeBelongsToCouple(
    coupleId: string,
    memberId: string | null,
  ): Promise<void> {
    if (memberId === null) return;

    const member = await this.coupleRepository.findMember(coupleId, memberId);
    if (!member) throw this.assigneeInvalid();
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Tarefa não encontrada',
      code: TASK_ERROR_CODES.TASK_NOT_FOUND,
      requestId: '',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });
  }

  private assigneeInvalid(): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Responsável não é membro deste casal',
      code: TASK_ERROR_CODES.TASK_ASSIGNEE_INVALID,
      details: [{ path: ['assigneeMemberId'], message: 'Escolha um membro deste casal' }],
      requestId: '',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });
  }

  private recurrenceWithoutDueDate(): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Tarefa recorrente precisa de prazo',
      code: TASK_ERROR_CODES.TASK_RECURRENCE_INVALID,
      details: [{ path: ['dueOn'], message: 'Informe o prazo da tarefa recorrente' }],
      requestId: '',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });
  }

  private alreadyCompleted(): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'Tarefa já concluída',
      code: TASK_ERROR_CODES.TASK_ALREADY_COMPLETED,
      requestId: '',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });
  }

  private notCompleted(): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'Tarefa não está concluída',
      code: TASK_ERROR_CODES.TASK_NOT_COMPLETED,
      requestId: '',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });
  }
}

function resolveAnchor(
  existing: TaskRow,
  data: UpdateTaskRequest,
  recurrence: { kind: TaskRecurrence; interval: number },
  dueOn: string | null,
): string | null {
  if (recurrence.kind === 'none') return null;
  if (data.dueOn !== undefined) return dueOn;
  if (existing.recurrenceKind === 'none') return dueOn;

  return existing.recurrenceAnchorOn ?? dueOn;
}

function isUntouched(task: TaskRow): boolean {
  return task.updatedAt.getTime() === task.createdAt.getTime();
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    assigneeMemberId: row.assigneeMemberId,
    dueOn: row.dueOn,
    recurrence: { kind: row.recurrenceKind, interval: row.recurrenceInterval },
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    completedByMemberId: row.completedByMemberId,
    createdAt: row.createdAt.toISOString(),
  };
}
