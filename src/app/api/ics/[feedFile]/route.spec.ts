import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderIcsFeed = vi.hoisted(() => vi.fn());
vi.mock('@/features/agenda/ics-feed', () => ({ renderIcsFeed }));

import { GET } from './route';

function call(feedFile: string) {
  return GET(new Request(`http://localhost/api/ics/${feedFile}`), {
    params: Promise.resolve({ feedFile }),
  });
}

beforeEach(() => {
  renderIcsFeed.mockReset();
});

describe('GET /api/ics/[feedFile]', () => {
  it('devolve o calendário como text/calendar, sem cache', async () => {
    renderIcsFeed.mockResolvedValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');

    const response = await call('token.ics');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('BEGIN:VCALENDAR');
    expect(renderIcsFeed).toHaveBeenCalledWith('token.ics');
  });

  it('feed inexistente, revogado ou malformado respondem o mesmo 404, sem cache', async () => {
    renderIcsFeed.mockResolvedValue(null);

    const first = await call('um.ics');
    const second = await call('outro');

    expect(first.status).toBe(404);
    expect(second.status).toBe(404);
    expect(await first.text()).toBe(await second.text());
    expect(first.headers.get('cache-control')).toBe('no-store');
  });
});
