'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { HealthCondition } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateHealthItem, useDeleteHealthItem, useUpdateHealthItem } from '../hooks/use-health';
import { conditionFormSchema, type ConditionFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type ConditionSheetProps = {
  memberId: string;
  open: boolean;
  condition: HealthCondition | null;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(condition: HealthCondition | null): ConditionFormValues {
  return {
    name: condition?.name ?? '',
    sinceOn: condition?.sinceOn ?? '',
    notes: condition?.notes ?? '',
  };
}

export function ConditionSheet({ memberId, open, condition, onOpenChange }: ConditionSheetProps) {
  const createCondition = useCreateHealthItem('conditions');
  const updateCondition = useUpdateHealthItem('conditions');
  const deleteCondition = useDeleteHealthItem('conditions');
  const form = useForm<ConditionFormValues>({
    resolver: zodResolver(conditionFormSchema),
    defaultValues: valuesFrom(condition),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(condition));
  }, [open, condition, form]);

  async function onSubmit(values: ConditionFormValues) {
    const payload = {
      name: values.name,
      sinceOn: values.sinceOn || null,
      notes: values.notes || null,
    };

    try {
      if (condition) {
        await updateCondition.mutateAsync({ memberId, itemId: condition.id, payload });
      } else {
        await createCondition.mutateAsync({ memberId, payload });
      }
      toast.success(condition ? 'Condição atualizada' : 'Condição adicionada');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeCondition() {
    if (!condition) return;

    deleteCondition.mutate(
      { memberId, itemId: condition.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Condição removida');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <HealthSheet
      title={condition ? 'Editar condição' : 'Nova condição'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createCondition.isPending || updateCondition.isPending}
      removal={
        condition
          ? {
              label: 'Remover condição',
              title: 'Remover condição?',
              description: `"${condition.name}" some da ficha.`,
              pending: deleteCondition.isPending,
              onConfirm: removeCondition,
            }
          : undefined
      }
    >
      <Field id="condition-name" label="Condição" error={form.formState.errors.name?.message}>
        <Input id="condition-name" autoComplete="off" {...form.register('name')} />
      </Field>
      <Field id="condition-since" label="Desde" error={form.formState.errors.sinceOn?.message}>
        <Input id="condition-since" type="date" {...form.register('sinceOn')} />
      </Field>
      <Field id="condition-notes" label="Observações" error={form.formState.errors.notes?.message}>
        <Textarea id="condition-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
