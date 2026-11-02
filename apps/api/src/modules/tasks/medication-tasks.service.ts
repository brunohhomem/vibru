import { Injectable } from '@nestjs/common';
import type { CalendarDate } from '@vibru/shared';
import type { DatabaseTransaction } from '../../database/database.module';
import { TasksRepository } from './tasks.repository';

export type MedicationTaskSpec = {
  coupleId: string;
  medicationId: string;
  memberId: string;
  title: string;
  times: string[];
  today: CalendarDate;
};

/**
 * Tarefas geradas pelos remédios (ADR 0004, regras 4.1 e 4.2). Só o módulo
 * `health` chama este serviço; a tela de Tarefas não edita essas tarefas.
 */
@Injectable()
export class MedicationTasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  /**
   * Deixa exatamente uma tarefa aberta por horário: cria as que faltam, exclui
   * (logicamente) as que sobraram e atualiza título e responsável das demais.
   */
  async sync(spec: MedicationTaskSpec, tx: DatabaseTransaction): Promise<void> {
    const openTasks = await this.tasksRepository.listOpenByMedication(
      spec.coupleId,
      spec.medicationId,
      tx,
    );
    const wantedTimes = new Set(spec.times);
    const keptTimes = new Set<string>();
    const staleIds: string[] = [];

    for (const task of openTasks) {
      const time = task.dueTime ? task.dueTime.slice(0, 5) : null;
      const isStale = time === null || !wantedTimes.has(time) || keptTimes.has(time);
      if (isStale) {
        staleIds.push(task.id);
        continue;
      }

      keptTimes.add(time);
      if (task.title === spec.title && task.assigneeMemberId === spec.memberId) continue;

      await this.tasksRepository.update(
        spec.coupleId,
        task.id,
        { title: spec.title, assigneeMemberId: spec.memberId },
        tx,
      );
    }

    await this.tasksRepository.softDeleteMany(spec.coupleId, staleIds, tx);

    for (const time of spec.times) {
      if (keptTimes.has(time)) continue;
      await this.createDailyTask(spec, time, tx);
    }
  }

  /** Desativar o remédio exclui as tarefas abertas; as concluídas ficam no histórico. */
  async removeOpen(coupleId: string, medicationId: string, tx: DatabaseTransaction): Promise<void> {
    const openTasks = await this.tasksRepository.listOpenByMedication(coupleId, medicationId, tx);
    await this.tasksRepository.softDeleteMany(
      coupleId,
      openTasks.map((task) => task.id),
      tx,
    );
  }

  private async createDailyTask(
    spec: MedicationTaskSpec,
    time: string,
    tx: DatabaseTransaction,
  ): Promise<void> {
    await this.tasksRepository.create(
      {
        coupleId: spec.coupleId,
        title: spec.title,
        assigneeMemberId: spec.memberId,
        dueOn: spec.today,
        dueTime: time,
        category: 'health',
        medicationId: spec.medicationId,
        recurrenceKind: 'daily',
        recurrenceInterval: 1,
        recurrenceAnchorOn: spec.today,
      },
      tx,
    );
  }
}
