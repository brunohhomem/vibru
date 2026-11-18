import { renderIcsFeed } from '@/features/agenda/ics-feed';

type RouteContext = { params: Promise<{ feedFile: string }> };

function noStoreHeaders(contentType?: string): Headers {
  const headers = new Headers();
  headers.set('cache-control', 'no-store');
  if (contentType) headers.set('content-type', contentType);
  return headers;
}

// Calendário externo não envia cookie: a credencial é o token da URL, por isso a rota é
// pública e responde o mesmo 404 para feed inexistente, revogado ou malformado.
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { feedFile } = await context.params;
  const calendar = await renderIcsFeed(feedFile);

  if (calendar === null) {
    return new Response('Feed não encontrado', { status: 404, headers: noStoreHeaders() });
  }

  return new Response(calendar, { headers: noStoreHeaders('text/calendar; charset=utf-8') });
}
