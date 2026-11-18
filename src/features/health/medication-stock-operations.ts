import type { DatabaseExecutor } from '@/db/client';
import type { TaskLowStock } from '@/features/tasks/task-schemas';
import { buildLowStockWarning } from './medication-rules';
import { decrementStock, incrementStock, markLowStockPrompted } from './medications-repository';

/**
 * Estoque dos remédios. Roda dentro da transação de concluir/reabrir a tarefa, para
 * que a conclusão e o desconto nunca se separem.
 *
 * Desconta a dose e devolve o aviso de estoque baixo uma única vez por reposição;
 * nulo quando não há o que avisar.
 */
export async function consumeDose(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<TaskLowStock | null> {
  const medication = await decrementStock(coupleId, medicationId, executor);
  if (!medication) return null;

  const warning = buildLowStockWarning(medication);
  if (!warning) return null;

  const claimed = await markLowStockPrompted(coupleId, medicationId, new Date(), executor);
  return claimed ? warning : null;
}

export async function returnDose(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<void> {
  await incrementStock(coupleId, medicationId, executor);
}
