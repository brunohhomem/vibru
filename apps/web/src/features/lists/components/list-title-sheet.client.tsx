'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateList, useRenameList } from '../hooks/use-lists';
import { listTitleFormSchema, type ListTitleFormValues } from '../schemas/forms';

type ListTitleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem `list`, o sheet cria; com `list`, renomeia. */
  list?: { id: string; title: string };
};

export function ListTitleSheet({ open, onOpenChange, list }: ListTitleSheetProps) {
  const createList = useCreateList();
  const renameList = useRenameList();
  const form = useForm<ListTitleFormValues>({
    resolver: zodResolver(listTitleFormSchema),
    defaultValues: { title: list?.title ?? '' },
  });
  const pending = createList.isPending || renameList.isPending;

  useEffect(() => {
    if (!open) return;
    form.reset({ title: list?.title ?? '' });
  }, [open, list, form]);

  async function onSubmit(values: ListTitleFormValues) {
    try {
      if (list) {
        await renameList.mutateAsync({ listId: list.id, title: values.title });
        toast.success('Lista renomeada');
      } else {
        await createList.mutateAsync(values.title);
        toast.success('Lista criada');
      }
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={list ? 'Renomear lista' : 'Nova lista'}
        className="inset-x-0 top-auto bottom-0 h-auto max-h-[85dvh] w-full rounded-t-xl border-t md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
      >
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
          noValidate
        >
          <Field id="list-title" label="Nome" error={form.formState.errors.title?.message}>
            <Input
              id="list-title"
              autoComplete="off"
              placeholder="Ex.: Mercado da semana"
              {...form.register('title')}
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
