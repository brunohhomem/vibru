'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { applyActionError } from '@/lib/action-error';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { PreferencesList } from './preferences-list.client';

const STATIC_MESSAGES = {
  unsupported: 'Este navegador não permite receber avisos.',
  needsInstall:
    'No iPhone e no iPad os avisos só funcionam com o app instalado. Use "Instalar app" no menu e abra o Vibru pela Tela de Início.',
  denied:
    'Os avisos estão bloqueados para o Vibru. Libere nas configurações de notificações do navegador ou do aparelho e volte aqui.',
} as const;

const WHAT_YOU_GET = 'Ative para receber avisos neste aparelho. Depois você escolhe quais.';

export function PushCard() {
  const { status, enable, disable } = usePushNotifications();

  if (status === 'loading' || status === 'notConfigured') return null;

  const busy = enable.isPending || disable.isPending;

  function handleEnable() {
    enable.mutate(undefined, {
      onSuccess: () => toast.success('Avisos ativados neste aparelho'),
      onError: (error) =>
        error instanceof Error && error.message === 'permission-not-granted'
          ? toast.error('Sem a permissão do navegador não dá para enviar avisos.')
          : applyActionError(error),
    });
  }

  function handleDisable() {
    disable.mutate(undefined, {
      onSuccess: () => toast.success('Avisos desativados neste aparelho'),
      onError: (error) => applyActionError(error),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avisos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === 'off' ? <p className="text-sm text-muted-foreground">{WHAT_YOU_GET}</p> : null}
        {status === 'on' ? <PreferencesList /> : null}
        {status !== 'off' && status !== 'on' ? (
          <p className="text-sm text-muted-foreground">{STATIC_MESSAGES[status]}</p>
        ) : null}
        {status === 'off' ? (
          <Button type="button" disabled={busy} onClick={handleEnable}>
            {enable.isPending ? 'Ativando…' : 'Ativar avisos neste aparelho'}
          </Button>
        ) : null}
        {status === 'on' ? (
          <Button type="button" variant="outline" disabled={busy} onClick={handleDisable}>
            {disable.isPending ? 'Desativando…' : 'Desativar avisos neste aparelho'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
