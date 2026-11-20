import { listEventsBetween } from '@/features/agenda/agenda-repository';
import { importantDateOccurrences } from '@/features/agenda/agenda-entries';
import { listImportantDates } from '@/features/agenda/important-dates-repository';
import { listOpenTasks } from '@/features/tasks/tasks-repository';
import { addDays, todayInSaoPaulo } from '@/lib/calendar-date';
import { groupByMember, selectTaskTitlesDueToday } from './daily-summary-rules';
import { dailySummaryPayload } from './push-payloads';
import { listSubscribedMembers, type SubscribedMember } from './push-repository';
import { sendPushToSubscription } from './push-sender';

export type DailySummaryResult = { couples: number; notificationsSent: number };

async function sendCoupleSummary(
  coupleId: string,
  subscribers: SubscribedMember[],
  today: string,
): Promise<number> {
  const tomorrow = addDays(today, 1);
  const [openTasks, events, importantDates] = await Promise.all([
    listOpenTasks(coupleId),
    listEventsBetween(coupleId, today, tomorrow),
    listImportantDates(coupleId),
  ]);
  const dateOccurrences = importantDates.flatMap((row) =>
    importantDateOccurrences(row, { from: today, to: tomorrow }),
  );
  const titlesOn = (day: string) => ({
    events: events.filter((event) => event.startsOn === day).map((event) => event.title),
    dates: dateOccurrences.filter((item) => item.date === day).map((item) => item.title),
  });
  const todayTitles = titlesOn(today);
  const tomorrowTitles = titlesOn(tomorrow);

  let sent = 0;
  for (const [memberId, devices] of groupByMember(subscribers)) {
    // Todos os aparelhos de um membro são da mesma pessoa, então têm as mesmas preferências.
    const preferences = devices[0]?.preferences;
    if (!preferences?.dailySummary) continue;

    const payload = dailySummaryPayload({
      taskTitles: selectTaskTitlesDueToday(openTasks, memberId, today),
      eventTitles: todayTitles.events,
      importantDateTitles: todayTitles.dates,
      tomorrowTitles: preferences.tomorrowPreview
        ? [...tomorrowTitles.events, ...tomorrowTitles.dates]
        : [],
    });
    if (!payload) continue;

    const outcomes = await Promise.all(
      devices.map((device) => sendPushToSubscription(device, payload)),
    );
    sent += outcomes.filter((outcome) => outcome === 'sent').length;
  }
  return sent;
}

/**
 * Roda sem sessão (chamado pelo cron): por isso parte das inscrições e, para cada casal,
 * só lê os dados daquele casal. Um casal que falha não impede o resumo dos outros.
 */
export async function sendDailySummaries(now: Date): Promise<DailySummaryResult> {
  const today = todayInSaoPaulo(now);
  const subscribers = await listSubscribedMembers();

  const byCouple = new Map<string, SubscribedMember[]>();
  for (const subscriber of subscribers) {
    byCouple.set(subscriber.coupleId, [...(byCouple.get(subscriber.coupleId) ?? []), subscriber]);
  }

  let notificationsSent = 0;
  for (const [coupleId, coupleSubscribers] of byCouple) {
    try {
      notificationsSent += await sendCoupleSummary(coupleId, coupleSubscribers, today);
    } catch {
      // Segue para o próximo casal; a falha aparece nos logs da Vercel pela resposta do cron.
    }
  }
  return { couples: byCouple.size, notificationsSent };
}
