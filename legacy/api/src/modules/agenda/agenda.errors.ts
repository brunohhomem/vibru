import { NotFoundException } from '@nestjs/common';
import { AGENDA_ERROR_CODES } from '@vibru/shared';

function notFound(message: string, code: string, path: string): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    message,
    code,
    requestId: '',
    path,
    timestamp: new Date().toISOString(),
  });
}

export function agendaItemNotFound(): NotFoundException {
  return notFound('Item não encontrado', AGENDA_ERROR_CODES.AGENDA_ITEM_NOT_FOUND, '/api/agenda');
}

/** Token inexistente, revogado ou malformado respondem igual. */
export function icsFeedNotFound(): NotFoundException {
  return notFound('Feed não encontrado', AGENDA_ERROR_CODES.ICS_FEED_NOT_FOUND, '/api/ics');
}
