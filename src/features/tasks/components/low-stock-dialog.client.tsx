'use client';

import type { TaskLowStock } from '@vibru/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { useAddToPharmacy } from '@/features/health/hooks/use-health';
import { applyApiError } from '@/lib/api-error';

type LowStockDialogProps = {
  lowStock: TaskLowStock | null;
  onClose: () => void;
};

function daysLabel(daysLeft: number): string {
  return daysLeft === 1 ? 'em 1 dia' : `em ${daysLeft} dias`;
}

export function LowStockDialog({ lowStock, onClose }: LowStockDialogProps) {
  const addToPharmacy = useAddToPharmacy();

  function addMedication() {
    if (!lowStock) return;

    addToPharmacy.mutate(lowStock.medicationId, {
      onSuccess: () => {
        toast.success('Adicionado à Farmácia');
        onClose();
      },
      onError: (error) => applyApiError(error),
    });
  }

  return (
    <Dialog open={lowStock !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        title="Estoque acabando"
        description={
          lowStock
            ? `${lowStock.name} acaba ${daysLabel(lowStock.daysLeft)}. Adicionar à lista Farmácia?`
            : undefined
        }
      >
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Agora não
          </Button>
          <Button type="button" disabled={addToPharmacy.isPending} onClick={addMedication}>
            {addToPharmacy.isPending ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
