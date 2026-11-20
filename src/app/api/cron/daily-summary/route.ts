import { timingSafeEqual } from 'node:crypto';
import { sendDailySummaries } from '@/features/push/daily-summary';
import { getEnv } from '@/lib/env';

// Nunca em cache: cada chamada precisa ler o dia de hoje.
export const dynamic = 'force-dynamic';

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = getEnv().CRON_SECRET;
  // Sem segredo configurado a rota fica fechada, em vez de aberta a qualquer um.
  if (!secret) return false;

  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  return Response.json(await sendDailySummaries(new Date()));
}
