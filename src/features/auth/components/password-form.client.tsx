'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { changePasswordSchema } from '@/features/profile/schemas';
import { onFormSubmit } from '@/lib/submit-form';
import { queryClient } from '@/lib/query-client';
import { ActionResultError, unwrapActionResult } from '@/lib/unwrap-action-result';
import { changePasswordAction } from '../password-actions';
import { ME_QUERY_KEY } from '../hooks/use-me';

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
};

type PasswordFormProps = {
  onDone?: () => void;
};

export function PasswordForm({ onDone }: PasswordFormProps) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  async function onSubmit(values: PasswordValues) {
    try {
      unwrapActionResult(await changePasswordAction(values));
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      toast.success('Senha alterada');
      form.reset();
      onDone?.();
    } catch (error) {
      if (error instanceof ActionResultError && error.field === 'currentPassword') {
        form.setError('currentPassword', { message: error.message });
        return;
      }
      toast.error(error instanceof ActionResultError ? error.message : 'Não foi possível salvar.');
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      noValidate
    >
      <Field
        id="currentPassword"
        label="Senha atual"
        error={form.formState.errors.currentPassword?.message}
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...form.register('currentPassword')}
        />
      </Field>
      <Field id="newPassword" label="Nova senha" error={form.formState.errors.newPassword?.message}>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...form.register('newPassword')}
        />
      </Field>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Salvando…' : 'Alterar senha'}
      </Button>
    </form>
  );
}
