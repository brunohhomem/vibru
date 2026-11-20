import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  sendDailySummaries: vi.fn(),
}));

vi.mock('@/lib/env', () => ({ getEnv: mocks.getEnv }));
vi.mock('@/features/push/daily-summary', () => ({
  sendDailySummaries: mocks.sendDailySummaries,
}));

import { GET } from './route';

const SECRET = 'a'.repeat(32);

function cronRequest(authorization?: string): Request {
  return new Request('https://vibru.test/api/cron/daily-summary', {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getEnv.mockReturnValue({ CRON_SECRET: SECRET });
  mocks.sendDailySummaries.mockResolvedValue({ couples: 1, notificationsSent: 2 });
});

describe('GET /api/cron/daily-summary', () => {
  it('com o segredo certo envia os resumos e devolve o total', async () => {
    const response = await GET(cronRequest(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ couples: 1, notificationsSent: 2 });
  });

  it('sem cabeçalho de autorização recusa e não envia nada', async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(401);
    expect(mocks.sendDailySummaries).not.toHaveBeenCalled();
  });

  it('com segredo errado recusa', async () => {
    const response = await GET(cronRequest(`Bearer ${'b'.repeat(32)}`));

    expect(response.status).toBe(401);
    expect(mocks.sendDailySummaries).not.toHaveBeenCalled();
  });

  it('sem CRON_SECRET configurado a rota fica fechada, mesmo para quem manda "Bearer undefined"', async () => {
    mocks.getEnv.mockReturnValue({ CRON_SECRET: undefined });

    const response = await GET(cronRequest('Bearer undefined'));

    expect(response.status).toBe(401);
    expect(mocks.sendDailySummaries).not.toHaveBeenCalled();
  });
});
