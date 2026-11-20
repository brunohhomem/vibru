'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { PasswordForm } from '@/features/auth/components/password-form.client';
import { queryClient } from '@/lib/query-client';
import { onFormSubmit } from '@/lib/submit-form';
import { ActionResultError, unwrapActionResult } from '@/lib/unwrap-action-result';
import { formatCpf, formatPhone } from '@/lib/masks';
import { updateProfileAction } from '../actions';
import { PushCard } from '@/features/push/components/push-card.client';
import { AvatarCard } from './avatar-card.client';
import { PartnerPasswordCard } from './partner-password-card.client';
import { PROFILE_QUERY_KEY, useProfile } from '../hooks/use-profile';
import type { ProfileResponse } from '../profile-response';
import { contactPayload, fullNameSchema, optionalCpf, optionalPhone } from '../schemas';

const profileFormSchema = z.object({
  fullName: fullNameSchema,
  cpf: optionalCpf,
  phone: optionalPhone,
});

type ProfileValues = {
  fullName: string;
  cpf: string;
  phone: string;
};

const FORM_FIELDS: ReadonlyArray<keyof ProfileValues> = ['fullName', 'cpf', 'phone'];

function isFormField(field: string | undefined): field is keyof ProfileValues {
  return FORM_FIELDS.some((formField) => formField === field);
}

async function saveProfile(values: ProfileValues): Promise<ProfileResponse> {
  return unwrapActionResult(
    await updateProfileAction({
      fullName: values.fullName,
      ...contactPayload(values.cpf, values.phone),
    }),
  );
}

export function ProfileScreen() {
  const profile = useProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: '', cpf: '', phone: '' },
  });

  useEffect(() => {
    if (!profile.data) return;
    form.reset({
      fullName: profile.data.fullName,
      cpf: profile.data.cpf ? formatCpf(profile.data.cpf) : '',
      phone: profile.data.phone ? formatPhone(profile.data.phone) : '',
    });
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: saveProfile,
    onSuccess: (data) => {
      toast.success('Perfil atualizado');
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
    onError: (error) => {
      if (error instanceof ActionResultError && isFormField(error.field)) {
        form.setError(error.field, { message: error.message });
        return;
      }
      toast.error(error instanceof ActionResultError ? error.message : 'Não foi possível salvar.');
    },
  });

  if (profile.isPending) return <LoadingState />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title="Não foi possível carregar o perfil"
        description="Tente de novo."
        onRetry={() => void profile.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-6 md:w-[40rem]">
      <PageHeader title="Perfil" description="Foto, dados pessoais e senha." />
      <AvatarCard />
      <PushCard />
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={onFormSubmit(
              form.handleSubmit((values) => {
                save.mutate(values);
              }),
            )}
            noValidate
          >
            <Field id="email" label="E-mail">
              <Input id="email" value={profile.data.email} readOnly />
            </Field>
            <Field
              id="fullName"
              label="Nome completo"
              error={form.formState.errors.fullName?.message}
            >
              <Input id="fullName" autoComplete="name" {...form.register('fullName')} />
            </Field>
            <MaskedInput
              id="cpf"
              name="cpf"
              label="CPF"
              control={form.control}
              error={form.formState.errors.cpf?.message}
              autoComplete="off"
              format={formatCpf}
            />
            <MaskedInput
              id="phone"
              name="phone"
              label="Telefone"
              control={form.control}
              error={form.formState.errors.phone?.message}
              autoComplete="tel"
              format={formatPhone}
            />
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <PartnerPasswordCard />
    </div>
  );
}
