'use client';

import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { describeActionFailure } from '@/lib/unwrap-action-result';
import { useMe } from '../hooks/use-me';
import { PasswordForm } from './password-form.client';

export function ChangePasswordScreen() {
  const me = useMe();
  const router = useRouter();

  if (me.isPending) return <LoadingState />;

  if (me.isError) {
    // Sessão expirada: o QueryClient global já está mandando para o /login.
    if (describeActionFailure(me.error) === 'redirect-to-login') {
      return <LoadingState label="Redirecionando…" />;
    }
    return (
      <ErrorState
        title="Não foi possível carregar a sessão"
        description="Tente de novo."
        onRetry={() => void me.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {me.data.user.mustChangePassword ? (
        <Alert>A senha inicial precisa ser trocada antes de continuar.</Alert>
      ) : null}
      <PasswordForm onDone={() => router.push('/app')} />
    </div>
  );
}
