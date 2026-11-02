'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Doctor } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { formatPhone } from '@/lib/masks';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateHealthItem, useDeleteHealthItem, useUpdateHealthItem } from '../hooks/use-health';
import { doctorFormSchema, type DoctorFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type DoctorSheetProps = {
  memberId: string;
  open: boolean;
  doctor: Doctor | null;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(doctor: Doctor | null): DoctorFormValues {
  return {
    name: doctor?.name ?? '',
    specialty: doctor?.specialty ?? '',
    phone: doctor?.phone ? formatPhone(doctor.phone) : '',
    notes: doctor?.notes ?? '',
  };
}

export function DoctorSheet({ memberId, open, doctor, onOpenChange }: DoctorSheetProps) {
  const createDoctor = useCreateHealthItem('doctors');
  const updateDoctor = useUpdateHealthItem('doctors');
  const deleteDoctor = useDeleteHealthItem('doctors');
  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: valuesFrom(doctor),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(doctor));
  }, [open, doctor, form]);

  async function onSubmit(values: DoctorFormValues) {
    const digits = values.phone.replace(/\D/g, '');
    const payload = {
      name: values.name,
      specialty: values.specialty || null,
      phone: digits || null,
      notes: values.notes || null,
    };

    try {
      if (doctor) {
        await updateDoctor.mutateAsync({ memberId, itemId: doctor.id, payload });
      } else {
        await createDoctor.mutateAsync({ memberId, payload });
      }
      toast.success(doctor ? 'Médico atualizado' : 'Médico adicionado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeDoctor() {
    if (!doctor) return;

    deleteDoctor.mutate(
      { memberId, itemId: doctor.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Médico removido');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <HealthSheet
      title={doctor ? 'Editar médico' : 'Novo médico'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createDoctor.isPending || updateDoctor.isPending}
      removal={
        doctor
          ? {
              label: 'Remover médico',
              title: 'Remover médico?',
              description: `"${doctor.name}" some da ficha.`,
              pending: deleteDoctor.isPending,
              onConfirm: removeDoctor,
            }
          : undefined
      }
    >
      <Field id="doctor-name" label="Nome" error={form.formState.errors.name?.message}>
        <Input id="doctor-name" autoComplete="off" {...form.register('name')} />
      </Field>
      <Field
        id="doctor-specialty"
        label="Especialidade"
        error={form.formState.errors.specialty?.message}
      >
        <Input id="doctor-specialty" autoComplete="off" {...form.register('specialty')} />
      </Field>
      <MaskedInput<DoctorFormValues>
        id="doctor-phone"
        name="phone"
        label="Telefone"
        control={form.control}
        error={form.formState.errors.phone?.message}
        autoComplete="off"
        format={formatPhone}
      />
      <Field id="doctor-notes" label="Observações" error={form.formState.errors.notes?.message}>
        <Textarea id="doctor-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
