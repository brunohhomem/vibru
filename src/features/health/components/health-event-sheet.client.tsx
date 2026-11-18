'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { HEALTH_EVENT_KINDS, todayInSaoPaulo, type Doctor, type HealthEvent } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateHealthItem, useDeleteHealthItem, useUpdateHealthItem } from '../hooks/use-health';
import { HEALTH_EVENT_KIND_LABELS } from '../lib/health-format';
import { healthEventFormSchema, type HealthEventFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type HealthEventSheetProps = {
  memberId: string;
  open: boolean;
  event: HealthEvent | null;
  doctors: Doctor[];
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(event: HealthEvent | null, doctors: Doctor[]): HealthEventFormValues {
  // Médico removido da ficha some do select; o valor não pode voltar para a API.
  const isDoctorListed = doctors.some((doctor) => doctor.id === event?.doctorId);

  return {
    kind: event?.kind ?? 'appointment',
    occurredOn: event?.occurredOn ?? todayInSaoPaulo(new Date()),
    title: event?.title ?? '',
    doctorId: isDoctorListed && event?.doctorId ? event.doctorId : '',
    notes: event?.notes ?? '',
  };
}

export function HealthEventSheet({
  memberId,
  open,
  event,
  doctors,
  onOpenChange,
}: HealthEventSheetProps) {
  const createEvent = useCreateHealthItem('events');
  const updateEvent = useUpdateHealthItem('events');
  const deleteEvent = useDeleteHealthItem('events');
  const form = useForm<HealthEventFormValues>({
    resolver: zodResolver(healthEventFormSchema),
    defaultValues: valuesFrom(event, doctors),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(event, doctors));
  }, [open, event, doctors, form]);

  async function onSubmit(values: HealthEventFormValues) {
    const payload = {
      kind: values.kind,
      occurredOn: values.occurredOn,
      title: values.title,
      doctorId: values.doctorId || null,
      notes: values.notes || null,
    };

    try {
      if (event) {
        await updateEvent.mutateAsync({ memberId, itemId: event.id, payload });
      } else {
        await createEvent.mutateAsync({ memberId, payload });
      }
      toast.success(event ? 'Evento atualizado' : 'Evento registrado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeEvent() {
    if (!event) return;

    deleteEvent.mutate(
      { memberId, itemId: event.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Evento removido');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <HealthSheet
      title={event ? 'Editar evento' : 'Novo evento'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createEvent.isPending || updateEvent.isPending}
      removal={
        event
          ? {
              label: 'Remover evento',
              title: 'Remover evento?',
              description: `"${event.title}" some do histórico.`,
              pending: deleteEvent.isPending,
              onConfirm: removeEvent,
            }
          : undefined
      }
    >
      <Field id="event-kind" label="Tipo" error={form.formState.errors.kind?.message}>
        <NativeSelect id="event-kind" {...form.register('kind')}>
          {HEALTH_EVENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {HEALTH_EVENT_KIND_LABELS[kind]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="event-title" label="Título" error={form.formState.errors.title?.message}>
        <Input id="event-title" autoComplete="off" {...form.register('title')} />
      </Field>
      <Field id="event-date" label="Data" error={form.formState.errors.occurredOn?.message}>
        <Input id="event-date" type="date" {...form.register('occurredOn')} />
      </Field>
      {doctors.length > 0 ? (
        <Field id="event-doctor" label="Médico" error={form.formState.errors.doctorId?.message}>
          <NativeSelect id="event-doctor" {...form.register('doctorId')}>
            <option value="">Nenhum</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Field id="event-notes" label="Observações" error={form.formState.errors.notes?.message}>
        <Textarea id="event-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
