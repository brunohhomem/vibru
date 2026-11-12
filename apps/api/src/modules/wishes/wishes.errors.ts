import { NotFoundException } from '@nestjs/common';
import { WISH_ERROR_CODES } from '@vibru/shared';

/** Desejo de outro casal, removido ou id malformado respondem igual (ADR 0003, 4.1). */
export function wishNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    message: 'Desejo não encontrado',
    code: WISH_ERROR_CODES.WISH_NOT_FOUND,
    requestId: '',
    path: '/api/wishes',
    timestamp: new Date().toISOString(),
  });
}
