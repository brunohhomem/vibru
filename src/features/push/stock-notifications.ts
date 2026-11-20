import { waitUntil } from '@vercel/functions';
import { findActiveMedication } from '@/features/health/medications-repository';
import type { TaskLowStock } from '@/features/tasks/task-schemas';
import { lowStockPayload } from './push-payloads';
import { sendPushToMember } from './push-sender';

type LowStockEvent = { coupleId: string; warning: TaskLowStock };

/**
 * Avisa só o dono do remédio, e só se ele ligou "estoque baixo" (vem desligado). O aviso
 * existe mesmo quando ele mesmo concluiu a dose: o diálogo na tela some com um toque,
 * e a notificação fica como lembrete de comprar.
 */
async function notifyLowStock(event: LowStockEvent): Promise<void> {
  const medication = await findActiveMedication(event.coupleId, event.warning.medicationId);
  if (!medication) return;

  await sendPushToMember(
    event.coupleId,
    medication.memberId,
    lowStockPayload(event.warning.name, event.warning.daysLeft),
    'lowStock',
  );
}

export function queueLowStockPush(event: LowStockEvent): void {
  waitUntil(notifyLowStock(event).catch(() => undefined));
}

export { notifyLowStock };
