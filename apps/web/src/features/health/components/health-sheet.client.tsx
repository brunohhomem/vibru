'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export type HealthSheetRemoval = {
  label: string;
  title: string;
  description: string;
  pending: boolean;
  onConfirm: () => void;
};

type HealthSheetProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  removal?: HealthSheetRemoval;
  children: ReactNode;
};

/** Casca comum dos formulários da ficha: Sheet, botão salvar e remoção com confirmação. */
export function HealthSheet({
  title,
  open,
  onOpenChange,
  onSubmit,
  pending,
  removal,
  children,
}: HealthSheetProps) {
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          title={title}
          className="inset-x-0 top-auto bottom-0 h-auto max-h-[85dvh] w-full rounded-t-xl border-t md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
        >
          <form
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
            onSubmit={onSubmit}
            noValidate
          >
            {children}
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
              {removal ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmRemoval(true)}
                >
                  {removal.label}
                </Button>
              ) : null}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {removal ? (
        <Dialog open={confirmRemoval} onOpenChange={setConfirmRemoval}>
          <DialogContent title={removal.title} description={removal.description}>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmRemoval(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={removal.pending}
                onClick={() => {
                  removal.onConfirm();
                  setConfirmRemoval(false);
                }}
              >
                {removal.pending ? 'Removendo…' : 'Remover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
