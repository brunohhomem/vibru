'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { todayInSaoPaulo, type Wish } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { HealthSheet } from '@/features/health/components/health-sheet.client';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { usePlanWish } from '../hooks/use-wishes';
import { planWishFormSchema, type PlanWishFormValues } from '../schemas/forms';

type PlanWishSheetProps = {
  wish: Wish | null;
  onOpenChange: (open: boolean) => void;
};

function initialValues(): PlanWishFormValues {
  return { startsOn: todayInSaoPaulo(new Date()), startTime: '' };
}

/** "Planejar" vira um evento na Agenda, com o título do desejo (ADR 0003, 3.9). */
export function PlanWishSheet({ wish, onOpenChange }: PlanWishSheetProps) {
  const planWish = usePlanWish();
  const form = useForm<PlanWishFormValues>({
    resolver: zodResolver(planWishFormSchema),
    defaultValues: initialValues(),
  });

  useEffect(() => {
    if (wish) form.reset(initialValues());
  }, [wish, form]);

  async function onSubmit(values: PlanWishFormValues) {
    if (!wish) return;

    try {
      await planWish.mutateAsync({
        wishId: wish.id,
        payload: { startsOn: values.startsOn, startTime: values.startTime || null },
      });
      toast.success('Planejado na Agenda');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  return (
    <HealthSheet
      title={wish ? `Planejar ${wish.title}` : 'Planejar'}
      open={wish !== null}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={planWish.isPending}
    >
      <Field id="plan-date" label="Dia" error={form.formState.errors.startsOn?.message}>
        <Input id="plan-date" type="date" {...form.register('startsOn')} />
      </Field>
      <Field
        id="plan-time"
        label="Horário"
        hint="Deixe em branco para o dia todo."
        error={form.formState.errors.startTime?.message}
      >
        <Input id="plan-time" type="time" {...form.register('startTime')} />
      </Field>
    </HealthSheet>
  );
}
