import type { CoupleMember, Task } from '@vibru/shared';
import type { CalendarDate } from '@vibru/shared';
import { Check, Repeat } from 'lucide-react';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { dueLabel, isOverdue } from '../lib/task-format';
import { cn } from '@/lib/cn';

type TaskItemProps = {
  task: Task;
  members: CoupleMember[];
  today: CalendarDate;
  onOpen: () => void;
  onComplete: () => void;
};

function assigneeOf(task: Task, members: CoupleMember[]): CoupleMember | undefined {
  if (!task.assigneeMemberId) return undefined;
  return members.find((member) => member.id === task.assigneeMemberId);
}

function AssigneeChip({ task, assignee }: { task: Task; assignee: CoupleMember | undefined }) {
  if (!assignee) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
        Nós
      </span>
    );
  }

  const classes = memberColorClasses(assignee.color);

  return (
    <span
      className={cn(
        'inline-flex max-w-32 truncate rounded-md px-1.5 py-0.5 text-xs font-medium',
        classes.tile,
        classes.onTile,
      )}
    >
      {assignee.displayName}
    </span>
  );
}

export function TaskItem({ task, members, today, onOpen, onComplete }: TaskItemProps) {
  const assignee = assigneeOf(task, members);
  const overdue = isOverdue(task.dueOn, today);
  const completeClasses = assignee
    ? cn(memberColorClasses(assignee.color).strong, 'text-background')
    : 'bg-primary text-primary-foreground';

  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <button
        type="button"
        aria-label={`Concluir ${task.title}`}
        onClick={onComplete}
        className={cn(
          'mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90',
          completeClasses,
        )}
      >
        <Check className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 flex-1 flex-col items-start gap-1 rounded-md px-1 py-0.5 text-left"
      >
        <span className="text-base font-medium">{task.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className={cn(overdue && 'font-semibold text-destructive')}>
            {overdue ? `Atrasada · ${dueLabel(task.dueOn, today)}` : dueLabel(task.dueOn, today)}
          </span>
          {task.recurrence.kind !== 'none' ? (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3.5" aria-hidden />
              <span className="sr-only">Tarefa recorrente</span>
            </span>
          ) : null}
          <AssigneeChip task={task} assignee={assignee} />
        </span>
      </button>
    </li>
  );
}

type CompletedTaskItemProps = {
  task: Task;
  members: CoupleMember[];
  pending: boolean;
  onReopen: () => void;
};

export function CompletedTaskItem({ task, members, pending, onReopen }: CompletedTaskItemProps) {
  const author = members.find((member) => member.id === task.completedByMemberId);

  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <span className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Check className="size-5" aria-hidden />
      </span>
      <div className="flex min-h-11 flex-1 flex-col items-start justify-center gap-1 py-0.5">
        <span className="text-base font-medium text-muted-foreground">{task.title}</span>
        <span className="text-xs text-muted-foreground">
          feita por {author?.displayName ?? 'alguém'}
        </span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onReopen}
        className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-primary hover:bg-accent disabled:opacity-50"
      >
        Reabrir
      </button>
    </li>
  );
}
