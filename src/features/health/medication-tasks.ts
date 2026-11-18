import type { DatabaseExecutor } from '@/db/client';
import type { MedicationRow } from '@/db/medications-schema';
import {
  insertTask,
  listOpenTasksByMedication,
  softDeleteTasks,
  updateTask,
} from '@/features/tasks/tasks-repository';
import { medicationTaskTitle, planMedicationTaskSync } from './medication-rules';
import { todayInSaoPaulo } from '@/lib/calendar-date';

/**
 * Tarefas geradas pelos remédios: uma diária por horário. Só a ficha de saúde chama
 * isto; a tela de Tarefas não edita essas tarefas.
 */
export async function syncMedicationTasks(
  medication: MedicationRow,
  executor: DatabaseExecutor,
): Promise<void> {
  const { coupleId, id: medicationId, memberId } = medication;
  const title = medicationTaskTitle(medication);
  const openTasks = await listOpenTasksByMedication(coupleId, medicationId, executor);
  const plan = planMedicationTaskSync(openTasks, { times: medication.times, title, memberId });

  for (const update of plan.updates) {
    await updateTask(
      coupleId,
      update.id,
      { title: update.title, assigneeMemberId: update.assigneeMemberId },
      executor,
    );
  }
  await softDeleteTasks(coupleId, plan.staleIds, executor);

  const today = todayInSaoPaulo(new Date());
  for (const time of plan.timesToCreate) {
    await insertTask(
      {
        coupleId,
        title,
        assigneeMemberId: memberId,
        dueOn: today,
        dueTime: time,
        category: 'health',
        medicationId,
        recurrenceKind: 'daily',
        recurrenceInterval: 1,
        recurrenceAnchorOn: today,
      },
      executor,
    );
  }
}

/** Desativar o remédio exclui as tarefas abertas; as concluídas ficam no histórico. */
export async function removeOpenMedicationTasks(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<void> {
  const openTasks = await listOpenTasksByMedication(coupleId, medicationId, executor);
  await softDeleteTasks(
    coupleId,
    openTasks.map((task) => task.id),
    executor,
  );
}
