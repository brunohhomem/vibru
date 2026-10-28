'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { CoupleResponse } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { COUPLE_QUERY_KEY, useCouple } from '@/features/couple/hooks/use-couple';
import { coupleFormSchema, type CoupleFormValues } from '@/features/couple/schemas/forms';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/api-error';
import { queryClient } from '@/lib/query-client';
import { onFormSubmit } from '@/lib/submit-form';

async function saveCouple(values: CoupleFormValues): Promise<CoupleResponse> {
  await api.patch<CoupleResponse>('/couple', {
    datingStartedOn: values.datingStartedOn || null,
    marriedOn: values.marriedOn || null,
  });

  const response = await api.patch<CoupleResponse>('/couple/members/me', {
    displayName: values.displayName,
  });

  return response.data;
}

export function CoupleSettingsScreen() {
  const couple = useCouple();
  const form = useForm<CoupleFormValues>({
    resolver: zodResolver(coupleFormSchema),
    defaultValues: { displayName: '', datingStartedOn: '', marriedOn: '' },
  });

  useEffect(() => {
    if (!couple.data) return;
    const me = couple.data.members.find((member) => member.isMe);
    form.reset({
      displayName: me?.displayName ?? '',
      datingStartedOn: couple.data.datingStartedOn ?? '',
      marriedOn: couple.data.marriedOn ?? '',
    });
  }, [couple.data, form]);

  const save = useMutation({
    mutationFn: saveCouple,
    onSuccess: (data) => {
      queryClient.setQueryData(COUPLE_QUERY_KEY, data);
      toast.success('Configurações do casal salvas');
    },
    onError: (error) => applyApiError(error, form.setError),
  });

  if (couple.isPending) return <LoadingState />;
  if (couple.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o casal"
        description="Tente de novo."
        onRetry={() => void couple.refetch()}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 md:max-w-2xl">
      <PageHeader title="Configurações do casal" description="Nomes e datas de vocês dois." />
      <Card>
        <CardHeader>
          <CardTitle>Vocês</CardTitle>
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
            <Field
              id="displayName"
              label="Meu nome no casal"
              error={form.formState.errors.displayName?.message}
            >
              <Input id="displayName" autoComplete="given-name" {...form.register('displayName')} />
            </Field>
            <Field
              id="datingStartedOn"
              label="Início do namoro"
              hint="Deixe em branco se ainda não sabe."
              error={form.formState.errors.datingStartedOn?.message}
            >
              <Input id="datingStartedOn" type="date" {...form.register('datingStartedOn')} />
            </Field>
            <Field
              id="marriedOn"
              label="Data do casamento"
              hint="Deixe em branco se ainda não casaram."
              error={form.formState.errors.marriedOn?.message}
            >
              <Input id="marriedOn" type="date" {...form.register('marriedOn')} />
            </Field>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando.' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
