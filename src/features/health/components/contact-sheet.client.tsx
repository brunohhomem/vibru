'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { EmergencyContact } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { applyApiError } from '@/lib/api-error';
import { formatPhone } from '@/lib/masks';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateHealthItem, useDeleteHealthItem, useUpdateHealthItem } from '../hooks/use-health';
import { contactFormSchema, type ContactFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type ContactSheetProps = {
  memberId: string;
  open: boolean;
  contact: EmergencyContact | null;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(contact: EmergencyContact | null): ContactFormValues {
  return {
    name: contact?.name ?? '',
    relationship: contact?.relationship ?? '',
    phone: contact ? formatPhone(contact.phone) : '',
  };
}

export function ContactSheet({ memberId, open, contact, onOpenChange }: ContactSheetProps) {
  const createContact = useCreateHealthItem('contacts');
  const updateContact = useUpdateHealthItem('contacts');
  const deleteContact = useDeleteHealthItem('contacts');
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: valuesFrom(contact),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(contact));
  }, [open, contact, form]);

  async function onSubmit(values: ContactFormValues) {
    const payload = {
      name: values.name,
      relationship: values.relationship,
      phone: values.phone.replace(/\D/g, ''),
    };

    try {
      if (contact) {
        await updateContact.mutateAsync({ memberId, itemId: contact.id, payload });
      } else {
        await createContact.mutateAsync({ memberId, payload });
      }
      toast.success(contact ? 'Contato atualizado' : 'Contato adicionado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeContact() {
    if (!contact) return;

    deleteContact.mutate(
      { memberId, itemId: contact.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Contato removido');
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  return (
    <HealthSheet
      title={contact ? 'Editar contato' : 'Novo contato de emergência'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createContact.isPending || updateContact.isPending}
      removal={
        contact
          ? {
              label: 'Remover contato',
              title: 'Remover contato?',
              description: `"${contact.name}" some da ficha.`,
              pending: deleteContact.isPending,
              onConfirm: removeContact,
            }
          : undefined
      }
    >
      <Field id="contact-name" label="Nome" error={form.formState.errors.name?.message}>
        <Input id="contact-name" autoComplete="off" {...form.register('name')} />
      </Field>
      <Field
        id="contact-relationship"
        label="Parentesco"
        error={form.formState.errors.relationship?.message}
      >
        <Input id="contact-relationship" autoComplete="off" {...form.register('relationship')} />
      </Field>
      <MaskedInput<ContactFormValues>
        id="contact-phone"
        name="phone"
        label="Telefone"
        control={form.control}
        error={form.formState.errors.phone?.message}
        autoComplete="off"
        format={formatPhone}
      />
    </HealthSheet>
  );
}
