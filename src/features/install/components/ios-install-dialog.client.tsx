'use client';

import { Share, SquarePlus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type IosInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IosInstallDialog({ open, onOpenChange }: IosInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Instalar o Vibru"
        description="No iPhone e no iPad a instalação é feita pelo Safari, em dois toques."
      >
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3">
            <Share className="size-5 shrink-0" aria-hidden />
            <span>
              Toque em <strong>Compartilhar</strong>, na barra do Safari.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <SquarePlus className="size-5 shrink-0" aria-hidden />
            <span>
              Escolha <strong>Adicionar à Tela de Início</strong>.
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
