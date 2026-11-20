import { waitUntil } from '@vercel/functions';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { taskAssignedPayload, taskCompletedPayload } from './push-payloads';
import { sendPushToMember } from './push-sender';

type TaskAssignedEvent = {
  coupleId: string;
  actorMemberId: string;
  assigneeMemberId: string | null | undefined;
  taskTitle: string;
};

type TaskCompletedEvent = {
  coupleId: string;
  actorMemberId: string;
  taskTitle: string;
  /** Tarefa de remédio é dado de saúde: nunca vai para a tela de bloqueio do outro. */
  isMedicationTask: boolean;
};

async function notifyTaskAssigned(event: TaskAssignedEvent): Promise<void> {
  const { coupleId, actorMemberId, assigneeMemberId, taskTitle } = event;
  // Atribuir a si mesmo, ou a "nós" (sem responsável), não tem a quem avisar.
  if (!assigneeMemberId || assigneeMemberId === actorMemberId) return;

  const members = await findCoupleMembers(coupleId);
  const actor = members.find((member) => member.id === actorMemberId);
  if (!actor) return;

  await sendPushToMember(
    coupleId,
    assigneeMemberId,
    taskAssignedPayload(actor.displayName, taskTitle),
    'taskAssigned',
  );
}

async function notifyTaskCompleted(event: TaskCompletedEvent): Promise<void> {
  const { coupleId, actorMemberId, taskTitle, isMedicationTask } = event;
  if (isMedicationTask) return;

  const members = await findCoupleMembers(coupleId);
  const actor = members.find((member) => member.id === actorMemberId);
  if (!actor) return;

  const payload = taskCompletedPayload(actor.displayName, taskTitle);
  const partners = members.filter((member) => member.id !== actorMemberId);
  await Promise.all(
    partners.map((partner) => sendPushToMember(coupleId, partner.id, payload, 'taskCompleted')),
  );
}

// As actions respondem ao usuário sem esperar o envio; o `catch` impede que um erro
// aqui vire rejeição não tratada, já que a notificação é um extra do pedido original.
export function queueTaskAssignedPush(event: TaskAssignedEvent): void {
  waitUntil(notifyTaskAssigned(event).catch(() => undefined));
}

export function queueTaskCompletedPush(event: TaskCompletedEvent): void {
  waitUntil(notifyTaskCompleted(event).catch(() => undefined));
}

export { notifyTaskAssigned, notifyTaskCompleted };
