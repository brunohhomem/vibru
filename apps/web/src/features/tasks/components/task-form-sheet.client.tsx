'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CoupleMember, Task } from '@vibru/shared';
import { addCalendarDays, type CalendarDate } from '@vibru/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { useCreateTask, useDeleteTask, useUpdateTask, type TaskPayload } from '../hooks/use-tasks';
import { RECURRENCE_OPTIONS } from '../lib/task-format';
import { taskFormSchema, type TaskFormValues } from '../schemas/forms';
import { cn } from '@/lib/cn';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';

const ASSIGNEE_NONE = 'nos';

type TaskFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  members: CoupleMember[];
  today: CalendarDate;
};

function valuesFromTask(task: Task | null): TaskFormValues {
  if (!task) {
    return {
      title: '',
      assignee: ASSIGNEE_NONE,
      dueOn: '',
      recurrenceKind: 'none',
      interval: '1',
      notes: '',
    };
  }

  return {
    title: task.title,
    assignee: task.assigneeMemberId ?? ASSIGNEE_NONE,
    dueOn: task.dueOn ?? '',
    recurrenceKind: task.recurrence.kind,
    interval: String(task.recurrence.interval),
    notes: task.notes ?? '',
  };
}

function toPayload(values: TaskFormValues): TaskPayload {
  return {
    title: values.title.trim(),
    notes: values.notes.trim() ? values.notes.trim() : null,
    assigneeMemberId: values.assignee === ASSIGNEE_NONE ? null : values.assignee,
    dueOn: values.dueOn ? values.dueOn : null,
    recurrence: {
      kind: values.recurrenceKind,
      interval: Number(values.interval),
    },
  };
}

type AssigneeOption = {
  value: string;
  label: string;
  dotClassName: string;
};

function buildAssigneeOptions(members: CoupleMember[]): AssigneeOption[] {
  return [
    { value: ASSIGNEE_NONE, label: 'Nós', dotClassName: 'bg-primary' },
    ...members.map((member) => ({
      value: member.id,
      label: member.displayName,
      dotClassName: memberColorClasses(member.color).strong,
    })),
  ];
}

function AssigneePicker({
  options,
  value,
  onChange,
}: {
  options: AssigneeOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Responsável"
      className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span className={cn('size-2 rounded-full', option.dotClassName)} aria-hidden />
          <span className="truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TaskFormSheet({ open, onOpenChange, task, members, today }: TaskFormSheetProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: valuesFromTask(task),
  });
  const recurrenceKind = form.watch('recurrenceKind');
  const assignee = form.watch('assignee');
  const pending = createTask.isPending || updateTask.isPending;
  const assigneeOptions = buildAssigneeOptions(members);

  useEffect(() => {
    if (!open) return;
    form.reset(valuesFromTask(task));
  }, [open, task, form]);

  async function onSubmit(values: TaskFormValues) {
    const payload = toPayload(values);

    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, payload });
        toast.success('Tarefa atualizada');
      } else {
        await createTask.mutateAsync(payload);
        toast.success('Tarefa criada');
      }
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function confirmDeletion() {
    if (!task) return;

    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        onOpenChange(false);
        toast.success('Tarefa excluída');
      },
      onError: (error) => applyApiError(error),
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          title={task ? 'Editar tarefa' : 'Nova tarefa'}
          className="inset-x-0 top-auto bottom-0 h-auto max-h-[85dvh] w-full rounded-t-xl border-t md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
        >
          <form
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
            onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
            noValidate
          >
            <Field id="task-title" label="Título" error={form.formState.errors.title?.message}>
              <Input
                id="task-title"
                autoComplete="off"
                placeholder="O que precisa ser feito?"
                {...form.register('title')}
              />
            </Field>

            <Field
              id="task-assignee"
              label="Responsável"
              error={form.formState.errors.assignee?.message}
            >
              <AssigneePicker
                options={assigneeOptions}
                value={assignee}
                onChange={(value) => form.setValue('assignee', value)}
              />
            </Field>

            <Field id="task-due" label="Prazo" error={form.formState.errors.dueOn?.message}>
              <div className="flex flex-col gap-2">
                <Input id="task-due" type="date" {...form.register('dueOn')} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue('dueOn', today, { shouldValidate: true })}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue('dueOn', addCalendarDays(today, 1), { shouldValidate: true })
                    }
                  >
                    Amanhã
                  </Button>
                </div>
              </div>
            </Field>

            <Field
              id="task-recurrence"
              label="Repetir"
              error={form.formState.errors.recurrenceKind?.message}
            >
              <NativeSelect id="task-recurrence" {...form.register('recurrenceKind')}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {recurrenceKind !== 'none' ? (
              <Field
                id="task-interval"
                label="A cada"
                hint="Número de dias, semanas, meses ou anos entre as repetições."
                error={form.formState.errors.interval?.message}
              >
                <Input
                  id="task-interval"
                  type="number"
                  min={1}
                  max={365}
                  {...form.register('interval')}
                />
              </Field>
            ) : null}

            <Field id="task-notes" label="Observações" error={form.formState.errors.notes?.message}>
              <Textarea id="task-notes" rows={4} {...form.register('notes')} />
            </Field>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
              {task ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Excluir tarefa
                </Button>
              ) : null}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          title="Excluir tarefa?"
          description={task ? `"${task.title}" some da lista para vocês dois.` : undefined}
        >
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={confirmDeletion}
            >
              {deleteTask.isPending ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
