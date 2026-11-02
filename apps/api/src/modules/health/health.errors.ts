import { NotFoundException } from '@nestjs/common';
import { HEALTH_ERROR_CODES } from '@vibru/shared';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function notFound(message: string, code: string): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    message,
    code,
    requestId: '',
    path: '/api/health',
    timestamp: new Date().toISOString(),
  });
}

/** As mensagens de erro nunca repetem dado de saúde (ADR 0004, regra 5.1). */
export function memberNotFound(): NotFoundException {
  return notFound('Pessoa não encontrada', HEALTH_ERROR_CODES.HEALTH_MEMBER_NOT_FOUND);
}

export function itemNotFound(): NotFoundException {
  return notFound('Item não encontrado', HEALTH_ERROR_CODES.HEALTH_ITEM_NOT_FOUND);
}

export function medicationNotFound(): NotFoundException {
  return notFound('Remédio não encontrado', HEALTH_ERROR_CODES.MEDICATION_NOT_FOUND);
}
