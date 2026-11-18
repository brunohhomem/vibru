'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BLOOD_TYPES, type HealthProfile } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useUpdateHealthProfile } from '../hooks/use-health';
import { bloodTypeLabel } from '../lib/health-format';
import { healthProfileFormSchema, type HealthProfileFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type ProfileSheetProps = {
  memberId: string;
  open: boolean;
  profile: HealthProfile;
  onOpenChange: (open: boolean) => void;
};

function organDonorFromProfile(organDonor: boolean | null): HealthProfileFormValues['organDonor'] {
  if (organDonor === null) return 'unknown';
  return organDonor ? 'yes' : 'no';
}

function organDonorToPayload(value: HealthProfileFormValues['organDonor']): boolean | null {
  if (value === 'unknown') return null;
  return value === 'yes';
}

function valuesFrom(profile: HealthProfile): HealthProfileFormValues {
  return {
    bloodType: profile.bloodType,
    organDonor: organDonorFromProfile(profile.organDonor),
    healthPlanName: profile.healthPlanName ?? '',
    healthPlanNumber: profile.healthPlanNumber ?? '',
    preferredHospital: profile.preferredHospital ?? '',
    notes: profile.notes ?? '',
  };
}

export function ProfileSheet({ memberId, open, profile, onOpenChange }: ProfileSheetProps) {
  const updateProfile = useUpdateHealthProfile();
  const form = useForm<HealthProfileFormValues>({
    resolver: zodResolver(healthProfileFormSchema),
    defaultValues: valuesFrom(profile),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(profile));
  }, [open, profile, form]);

  async function onSubmit(values: HealthProfileFormValues) {
    const payload = {
      bloodType: values.bloodType,
      organDonor: organDonorToPayload(values.organDonor),
      healthPlanName: values.healthPlanName || null,
      healthPlanNumber: values.healthPlanNumber || null,
      preferredHospital: values.preferredHospital || null,
      notes: values.notes || null,
    };

    try {
      await updateProfile.mutateAsync({ memberId, payload });
      toast.success('Ficha atualizada');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  return (
    <HealthSheet
      title="Dados da ficha"
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={updateProfile.isPending}
    >
      <Field
        id="profile-blood"
        label="Tipo sanguíneo"
        error={form.formState.errors.bloodType?.message}
      >
        <NativeSelect id="profile-blood" {...form.register('bloodType')}>
          {BLOOD_TYPES.map((bloodType) => (
            <option key={bloodType} value={bloodType}>
              {bloodTypeLabel(bloodType)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        id="profile-donor"
        label="Doador de órgãos"
        error={form.formState.errors.organDonor?.message}
      >
        <NativeSelect id="profile-donor" {...form.register('organDonor')}>
          <option value="unknown">Não informado</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
        </NativeSelect>
      </Field>
      <Field
        id="profile-plan"
        label="Plano de saúde"
        error={form.formState.errors.healthPlanName?.message}
      >
        <Input id="profile-plan" autoComplete="off" {...form.register('healthPlanName')} />
      </Field>
      <Field
        id="profile-plan-number"
        label="Número do plano"
        error={form.formState.errors.healthPlanNumber?.message}
      >
        <Input id="profile-plan-number" autoComplete="off" {...form.register('healthPlanNumber')} />
      </Field>
      <Field
        id="profile-hospital"
        label="Hospital de preferência"
        error={form.formState.errors.preferredHospital?.message}
      >
        <Input id="profile-hospital" autoComplete="off" {...form.register('preferredHospital')} />
      </Field>
      <Field id="profile-notes" label="Observações" error={form.formState.errors.notes?.message}>
        <Textarea id="profile-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
