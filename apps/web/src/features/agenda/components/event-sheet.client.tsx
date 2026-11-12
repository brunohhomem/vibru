'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AgendaEvent, CalendarDate } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HealthSheet } from '@/features/health/components/health-sheet.client';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateAgendaItem, useDeleteAgendaItem, useUpdateAgendaItem } from '../hooks/use-agenda';
import { eventFormSchema, type EventFormValues } from '../schemas/forms';

type EventSheetProps = {
  open: boolean;
  event: AgendaEvent | null;
  defaultDate: CalendarDate;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(event: AgendaEvent | null, defaultDate: CalendarDate): EventFormValues {
  return {
    title: event?.title ?? '',
    startsOn: event?.startsOn ?? defaultDate,
    startTime: event?.startTime ?? '',
    notes: event?.notes ?? '',
  };
}

export function EventSheet({ open, event, defaultDate, onOpenChange }: EventSheetProps) {
  const createEvent = useCreateAgendaItem('events');
  const updateEvent = useUpdateAgendaItem('events');
  const deleteEvent = useDeleteAgendaItem('events');
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: valuesFrom(event, defaultDate),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(event, defaultDate));
  }, [open, event, defaultDate, form]);

  async function onSubmit(values: EventFormValues) {
    const payload = {
      title: values.title,
      startsOn: values.startsOn,
      startTime: values.startTime || null,
      notes: values.notes || null,
    };

    try {
      if (event) {
        await updateEvent.mutateAsync({ itemId: event.id, payload });
      } else {
        await createEvent.mutateAsync(payload);
      }
      toast.success(event ? 'Evento atualizado' : 'Evento criado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeEvent() {
    if (!event) return;

    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Evento removido');
      },
      onError: (error) => applyApiError(error),
    });
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
              description: `"${event.title}" some da agenda.`,
              pending: deleteEvent.isPending,
              onConfirm: removeEvent,
            }
          : undefined
      }
    >
      <Field id="event-title" label="Título" error={form.formState.errors.title?.message}>
        <Input id="event-title" autoComplete="off" {...form.register('title')} />
      </Field>
      <Field id="event-date" label="Dia" error={form.formState.errors.startsOn?.message}>
        <Input id="event-date" type="date" {...form.register('startsOn')} />
      </Field>
      <Field
        id="event-time"
        label="Horário"
        hint="Deixe em branco para o dia todo."
        error={form.formState.errors.startTime?.message}
      >
        <Input id="event-time" type="time" {...form.register('startTime')} />
      </Field>
      <Field id="event-notes" label="Observações" error={form.formState.errors.notes?.message}>
        <Textarea id="event-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
