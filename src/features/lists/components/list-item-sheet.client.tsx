'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ListItem } from '@vibru/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useDeleteListItem, useUpdateListItem } from '../hooks/use-lists';
import { listItemFormSchema, type ListItemFormValues } from '../schemas/forms';

type ListItemSheetProps = {
  listId: string;
  item: ListItem | null;
  onOpenChange: (open: boolean) => void;
};

export function ListItemSheet({ listId, item, onOpenChange }: ListItemSheetProps) {
  const updateItem = useUpdateListItem();
  const deleteItem = useDeleteListItem();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<ListItemFormValues>({
    resolver: zodResolver(listItemFormSchema),
    defaultValues: { title: item?.title ?? '' },
  });

  useEffect(() => {
    if (!item) return;
    form.reset({ title: item.title });
  }, [item, form]);

  async function onSubmit(values: ListItemFormValues) {
    if (!item) return;

    try {
      await updateItem.mutateAsync({ listId, itemId: item.id, title: values.title });
      toast.success('Item atualizado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function confirmRemoval() {
    if (!item) return;

    deleteItem.mutate(
      { listId, itemId: item.id },
      {
        onSuccess: () => {
          setConfirmDelete(false);
          onOpenChange(false);
          toast.success('Item removido');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <>
      <Sheet open={item !== null} onOpenChange={onOpenChange}>
        <SheetContent
          title="Editar item"
          className="inset-x-0 top-auto bottom-0 h-auto max-h-[85dvh] w-full rounded-t-xl border-t md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
        >
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
            noValidate
          >
            <Field id="list-item-title" label="Item" error={form.formState.errors.title?.message}>
              <Input id="list-item-title" autoComplete="off" {...form.register('title')} />
            </Field>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Remover item
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          title="Remover item?"
          description={item ? `"${item.title}" some da lista para vocês dois.` : undefined}
        >
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteItem.isPending}
              onClick={confirmRemoval}
            >
              {deleteItem.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
