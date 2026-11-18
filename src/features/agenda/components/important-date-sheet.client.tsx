'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CalendarDate, ImportantDate } from '@vibru/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HealthSheet } from '@/features/health/components/health-sheet.client';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateAgendaItem, useDeleteAgendaItem, useUpdateAgendaItem } from '../hooks/use-agenda';
import { importantDateFormSchema, type ImportantDateFormValues } from '../schemas/forms';

type ImportantDateSheetProps = {
  open: boolean;
  importantDate: ImportantDate | null;
  defaultDate: CalendarDate;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(
  importantDate: ImportantDate | null,
  defaultDate: CalendarDate,
): ImportantDateFormValues {
  return {
    title: importantDate?.title ?? '',
    occursOn: importantDate?.occursOn ?? defaultDate,
    repeatsYearly: importantDate?.repeatsYearly ?? true,
  };
}

export function ImportantDateSheet({
  open,
  importantDate,
  defaultDate,
  onOpenChange,
}: ImportantDateSheetProps) {
  const createDate = useCreateAgendaItem('importantDates');
  const updateDate = useUpdateAgendaItem('importantDates');
  const deleteDate = useDeleteAgendaItem('importantDates');
  const form = useForm<ImportantDateFormValues>({
    resolver: zodResolver(importantDateFormSchema),
    defaultValues: valuesFrom(importantDate, defaultDate),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(importantDate, defaultDate));
  }, [open, importantDate, defaultDate, form]);

  async function onSubmit(values: ImportantDateFormValues) {
    try {
      if (importantDate) {
        await updateDate.mutateAsync({ itemId: importantDate.id, payload: values });
      } else {
        await createDate.mutateAsync(values);
      }
      toast.success(importantDate ? 'Data atualizada' : 'Data adicionada');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeDate() {
    if (!importantDate) return;

    deleteDate.mutate(importantDate.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Data removida');
      },
      onError: (error) => applyApiError(error),
    });
  }

  return (
    <HealthSheet
      title={importantDate ? 'Editar data' : 'Nova data importante'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createDate.isPending || updateDate.isPending}
      removal={
        importantDate
          ? {
              label: 'Remover data',
              title: 'Remover data?',
              description: `"${importantDate.title}" some da agenda.`,
              pending: deleteDate.isPending,
              onConfirm: removeDate,
            }
          : undefined
      }
    >
      <Field id="date-title" label="Título" error={form.formState.errors.title?.message}>
        <Input id="date-title" autoComplete="off" {...form.register('title')} />
      </Field>
      <Field id="date-occurs-on" label="Data" error={form.formState.errors.occursOn?.message}>
        <Input id="date-occurs-on" type="date" {...form.register('occursOn')} />
      </Field>
      <Controller
        control={form.control}
        name="repeatsYearly"
        render={({ field }) => (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="date-repeats">Repete todo ano</Label>
            <Switch id="date-repeats" checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
    </HealthSheet>
  );
}
