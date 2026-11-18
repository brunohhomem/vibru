import type { NewMedicationRow } from '@/db/medications-schema';
import type { TaskLowStock } from '@/features/tasks/task-schemas';
import { daysOfMedicationLeft } from './medication-stock';
import type { UpdateMedicationRequest } from './health-schemas';

const TIME_WITHOUT_SECONDS_LENGTH = 5;

export function sortTimes(times: string[]): string[] {
  return [...times].sort();
}

export function medicationTaskTitle(medication: { name: string; dosage: string }): string {
  return `Tomar ${medication.name} ${medication.dosage}`.trim();
}

/**
 * Repor o estoque (valor maior que o atual) libera a próxima pergunta da Farmácia.
 * Estoque antes não controlado e agora controlado também conta.
 */
export function isRestock(
  existingStock: number | null,
  patchStock: number | null | undefined,
): boolean {
  if (patchStock === undefined || patchStock === null) return false;
  if (existingStock === null) return true;
  return patchStock > existingStock;
}

export function buildMedicationUpdatePatch(
  existing: { stockUnits: number | null },
  patch: UpdateMedicationRequest,
): Partial<NewMedicationRow> {
  const changes: Partial<NewMedicationRow> = { ...patch };
  if (patch.times !== undefined) changes.times = sortTimes(patch.times);
  if (isRestock(existing.stockUnits, patch.stockUnits)) changes.lowStockPromptedAt = null;
  return changes;
}

export type OpenMedicationTask = {
  id: string;
  dueTime: string | null;
  title: string;
  assigneeMemberId: string | null;
};

export type MedicationTaskSyncPlan = {
  staleIds: string[];
  updates: Array<{ id: string; title: string; assigneeMemberId: string }>;
  timesToCreate: string[];
};

/**
 * Deixa exatamente uma tarefa aberta por horário: as que faltam são criadas, as que
 * sobraram (horário removido, duplicada ou sem horário) são excluídas, e as demais
 * ganham o título e o responsável novos quando mudaram.
 */
export function planMedicationTaskSync(
  openTasks: readonly OpenMedicationTask[],
  spec: { times: string[]; title: string; memberId: string },
): MedicationTaskSyncPlan {
  const wantedTimes = new Set(spec.times);
  const keptTimes = new Set<string>();
  const plan: MedicationTaskSyncPlan = { staleIds: [], updates: [], timesToCreate: [] };

  for (const task of openTasks) {
    const time = task.dueTime ? task.dueTime.slice(0, TIME_WITHOUT_SECONDS_LENGTH) : null;
    if (time === null || !wantedTimes.has(time) || keptTimes.has(time)) {
      plan.staleIds.push(task.id);
      continue;
    }

    keptTimes.add(time);
    if (task.title === spec.title && task.assigneeMemberId === spec.memberId) continue;
    plan.updates.push({ id: task.id, title: spec.title, assigneeMemberId: spec.memberId });
  }

  plan.timesToCreate = spec.times.filter((time) => !keptTimes.has(time));
  return plan;
}

/**
 * Aviso de estoque baixo depois de descontar uma dose. Nulo quando o estoque não é
 * controlado, não há horário (sem consumo previsível) ou ainda sobra mais que o limite.
 */
export function buildLowStockWarning(medication: {
  id: string;
  name: string;
  stockUnits: number | null;
  unitsPerDose: number;
  times: string[];
  lowStockDays: number;
}): TaskLowStock | null {
  const daysLeft = daysOfMedicationLeft({
    stockUnits: medication.stockUnits,
    unitsPerDose: medication.unitsPerDose,
    timesPerDay: medication.times.length,
  });
  if (daysLeft === null || daysLeft > medication.lowStockDays) return null;

  return { medicationId: medication.id, name: medication.name, daysLeft };
}
