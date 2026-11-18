'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useAddListItem } from '../hooks/use-lists';
import { listItemFormSchema, type ListItemFormValues } from '../schemas/forms';

export function ListAddItemForm({ listId }: { listId: string }) {
  const addItem = useAddListItem();
  const form = useForm<ListItemFormValues>({
    resolver: zodResolver(listItemFormSchema),
    defaultValues: { title: '' },
  });
  const error = form.formState.errors.title?.message;

  async function onSubmit(values: ListItemFormValues) {
    try {
      await addItem.mutateAsync({ listId, title: values.title });
      form.reset({ title: '' });
      form.setFocus('title');
      toast.success('Item adicionado');
    } catch (apiError) {
      applyApiError(apiError, form.setError);
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      noValidate
    >
      <div className="flex gap-2">
        <Input
          aria-label="Novo item"
          placeholder="Novo item"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          {...form.register('title')}
        />
        <Button type="submit" disabled={addItem.isPending}>
          Adicionar
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
