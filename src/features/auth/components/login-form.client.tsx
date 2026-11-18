'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { onFormSubmit } from '@/lib/submit-form';
import { queryClient } from '@/lib/query-client';
import { ME_QUERY_KEY } from '../hooks/use-me';
import { safeAppPath } from '../lib/next-path';
import { loginAction } from '../actions';
import { loginRequestSchema } from '@/features/auth/login-schema';

type LoginValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    const result = await loginAction(values);
    if (!result.ok) {
      form.setError('password', { message: result.message });
      return;
    }
    // Cache de outro usuário do mesmo aparelho nunca pode sobreviver ao login.
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    if (result.data.mustChangePassword) {
      router.push('/change-password');
      return;
    }
    router.push(safeAppPath(searchParams.get('next')));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      noValidate
    >
      <Field id="email" label="E-mail" error={form.formState.errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register('email')}
        />
      </Field>
      <Field id="password" label="Senha" error={form.formState.errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register('password')}
        />
      </Field>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
