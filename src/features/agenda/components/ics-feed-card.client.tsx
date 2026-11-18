'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { applyApiError } from '@/lib/api-error';
import { useIcsFeedStatus, useRegenerateIcsFeed, useRevokeIcsFeed } from '../hooks/use-agenda';

type PendingAction = 'regenerate' | 'revoke';

const CONFIRMATION: Record<PendingAction, { title: string; description: string; label: string }> = {
  regenerate: {
    title: 'Gerar novo link?',
    description: 'O link atual para de funcionar nos calendários que já assinaram.',
    label: 'Gerar novo link',
  },
  revoke: {
    title: 'Desligar o feed?',
    description: 'O calendário do celular deixa de receber a agenda.',
    label: 'Desligar',
  },
};

export function IcsFeedCard() {
  const status = useIcsFeedStatus();
  const regenerate = useRegenerateIcsFeed();
  const revoke = useRevokeIcsFeed();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  function generateLink() {
    regenerate.mutate(undefined, {
      onSuccess: ({ feedPath }) => setFeedUrl(`${window.location.origin}${feedPath}`),
      onError: (error) => applyApiError(error),
    });
  }

  function revokeLink() {
    revoke.mutate(undefined, {
      onSuccess: () => {
        setFeedUrl(null);
        toast.success('Feed desligado');
      },
      onError: (error) => applyApiError(error),
    });
  }

  function confirm() {
    if (pendingAction === 'regenerate') generateLink();
    if (pendingAction === 'revoke') revokeLink();
    setPendingAction(null);
  }

  async function copyLink() {
    if (!feedUrl) return;

    await navigator.clipboard.writeText(feedUrl);
    toast.success('Link copiado');
  }

  const isActive = status.data?.active ?? false;
  const confirmation = pendingAction ? CONFIRMATION[pendingAction] : null;

  return (
    <Card aria-label="Calendário do celular" role="region">
      <CardHeader>
        <CardTitle>Calendário do celular</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Assine a agenda no calendário do celular. Quem tiver o link vê eventos e datas, por isso o
          trate como uma senha.
        </p>

        {feedUrl ? (
          <>
            <Input aria-label="Link do calendário" readOnly value={feedUrl} />
            <p className="text-sm text-muted-foreground">
              Copie agora: este link só aparece uma vez.
            </p>
            <Button type="button" onClick={() => void copyLink()}>
              Copiar link
            </Button>
          </>
        ) : null}

        {isActive && !feedUrl ? <p className="text-sm font-medium">Feed ligado.</p> : null}

        {!isActive && status.isSuccess ? (
          <Button type="button" disabled={regenerate.isPending} onClick={generateLink}>
            {regenerate.isPending ? 'Gerando…' : 'Gerar link'}
          </Button>
        ) : null}

        {isActive ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingAction('regenerate')}>
              Gerar novo link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setPendingAction('revoke')}
            >
              Desligar
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent title={confirmation?.title ?? ''} description={confirmation?.description}>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirm}>
              {confirmation?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
