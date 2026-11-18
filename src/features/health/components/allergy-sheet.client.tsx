'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ALLERGY_SEVERITIES, type Allergy } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateHealthItem, useDeleteHealthItem, useUpdateHealthItem } from '../hooks/use-health';
import { SEVERITY_LABELS } from '../lib/health-format';
import { allergyFormSchema, type AllergyFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type AllergySheetProps = {
  memberId: string;
  open: boolean;
  allergy: Allergy | null;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(allergy: Allergy | null): AllergyFormValues {
  return {
    substance: allergy?.substance ?? '',
    reaction: allergy?.reaction ?? '',
    severity: allergy?.severity ?? 'moderate',
  };
}

export function AllergySheet({ memberId, open, allergy, onOpenChange }: AllergySheetProps) {
  const createAllergy = useCreateHealthItem('allergies');
  const updateAllergy = useUpdateHealthItem('allergies');
  const deleteAllergy = useDeleteHealthItem('allergies');
  const form = useForm<AllergyFormValues>({
    resolver: zodResolver(allergyFormSchema),
    defaultValues: valuesFrom(allergy),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(allergy));
  }, [open, allergy, form]);

  async function onSubmit(values: AllergyFormValues) {
    const payload = {
      substance: values.substance,
      reaction: values.reaction || null,
      severity: values.severity,
    };

    try {
      if (allergy) {
        await updateAllergy.mutateAsync({ memberId, itemId: allergy.id, payload });
      } else {
        await createAllergy.mutateAsync({ memberId, payload });
      }
      toast.success(allergy ? 'Alergia atualizada' : 'Alergia adicionada');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeAllergy() {
    if (!allergy) return;

    deleteAllergy.mutate(
      { memberId, itemId: allergy.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Alergia removida');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <HealthSheet
      title={allergy ? 'Editar alergia' : 'Nova alergia'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createAllergy.isPending || updateAllergy.isPending}
      removal={
        allergy
          ? {
              label: 'Remover alergia',
              title: 'Remover alergia?',
              description: `"${allergy.substance}" some da ficha.`,
              pending: deleteAllergy.isPending,
              onConfirm: removeAllergy,
            }
          : undefined
      }
    >
      <Field
        id="allergy-substance"
        label="Substância"
        error={form.formState.errors.substance?.message}
      >
        <Input id="allergy-substance" autoComplete="off" {...form.register('substance')} />
      </Field>
      <Field id="allergy-reaction" label="Reação" error={form.formState.errors.reaction?.message}>
        <Input id="allergy-reaction" autoComplete="off" {...form.register('reaction')} />
      </Field>
      <Field
        id="allergy-severity"
        label="Gravidade"
        error={form.formState.errors.severity?.message}
      >
        <NativeSelect id="allergy-severity" {...form.register('severity')}>
          {ALLERGY_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {SEVERITY_LABELS[severity]}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </HealthSheet>
  );
}
