'use client';

import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberAvatar } from '@/features/couple/components/member-avatar';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { applyActionError } from '@/lib/action-error';
import { useChangeAvatar, useRemoveAvatar } from '../hooks/use-avatar';
import { AvatarImageError } from '../lib/resize-avatar-image';

function changeButtonLabel(uploading: boolean, hasPhoto: boolean): string {
  if (uploading) return 'Enviando…';
  return hasPhoto ? 'Trocar foto' : 'Escolher foto';
}

export function AvatarCard() {
  const couple = useCouple();
  const fileInput = useRef<HTMLInputElement>(null);
  const change = useChangeAvatar();
  const remove = useRemoveAvatar();

  const me = couple.data?.members.find((member) => member.isMe);
  if (!me) return null;

  const busy = change.isPending || remove.isPending;

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpar o valor permite escolher o mesmo arquivo de novo depois de um erro.
    event.target.value = '';
    if (!file) return;

    change.mutate(file, {
      onSuccess: () => toast.success('Foto atualizada'),
      onError: (error) =>
        error instanceof AvatarImageError ? toast.error(error.message) : applyActionError(error),
    });
  }

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Foto removida'),
      onError: (error) => applyActionError(error),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <MemberAvatar member={me} size="large" />
        <div className="flex flex-col gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher foto"
            onChange={handleFileChosen}
          />
          <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
            {changeButtonLabel(change.isPending, me.avatarUrl !== null)}
          </Button>
          {me.avatarUrl ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={handleRemove}>
              Remover foto
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
