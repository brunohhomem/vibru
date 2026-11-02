'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Task } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useUpdateTask } from '../hooks/use-tasks';
import { taskNotesFormSchema, type TaskNotesFormValues } from '../schemas/forms';

type TaskNotesSheetProps = {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Tarefa de remédio nasce do cadastro do remédio. Aqui só as observações
 * mudam; título, horário e responsável mudam pelo remédio.
 */
export function TaskNotesSheet({ task, onOpenChange }: TaskNotesSheetProps) {
  const updateTask = useUpdateTask();
  const form = useForm<TaskNotesFormValues>({
    resolver: zodResolver(taskNotesFormSchema),
    defaultValues: { notes: task?.notes ?? '' },
  });

  useEffect(() => {
    if (!task) return;
    form.reset({ notes: task.notes ?? '' });
  }, [task, form]);

  async function onSubmit(values: TaskNotesFormValues) {
    if (!task) return;

    try {
      const notes = values.notes.trim() ? values.notes.trim() : null;
      await updateTask.mutateAsync({ id: task.id, payload: { notes } });
      toast.success('Tarefa atualizada');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  return (
    <Sheet open={task !== null} onOpenChange={onOpenChange}>
      <SheetContent
        title={task?.title ?? 'Tarefa de remédio'}
        className="inset-x-0 top-auto bottom-0 h-auto max-h-[85dvh] w-full rounded-t-xl border-t md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
      >
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
          noValidate
        >
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Mude pelo remédio. Aqui só as observações.
          </p>
          <Field
            id="task-notes-only"
            label="Observações"
            error={form.formState.errors.notes?.message}
          >
            <Textarea id="task-notes-only" rows={4} {...form.register('notes')} />
          </Field>
          <Button type="submit" disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
