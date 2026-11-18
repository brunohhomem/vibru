import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GIFT_ERROR_CODES } from '@vibru/shared';

function body(statusCode: number, error: string, message: string, code: string) {
  return {
    statusCode,
    error,
    message,
    code,
    requestId: '',
    path: '/api/members/gifts',
    timestamp: new Date().toISOString(),
  };
}

/** Membro ou presente de outro casal, removido ou id malformado respondem igual (ADR 0003, 4.1). */
export function giftNotFound(): NotFoundException {
  return new NotFoundException(
    body(404, 'Not Found', 'Presente não encontrado', GIFT_ERROR_CODES.GIFT_NOT_FOUND),
  );
}

/** Dentro do casal a parceira já vê a lista; o 403 não esconde nada. */
export function giftNotOwner(): ForbiddenException {
  return new ForbiddenException(
    body(403, 'Forbidden', 'Só o dono mexe na própria lista', GIFT_ERROR_CODES.GIFT_NOT_OWNER),
  );
}

export function giftSelfReservation(): UnprocessableEntityException {
  return new UnprocessableEntityException(
    body(
      422,
      'Unprocessable Entity',
      'Você não reserva presentes da própria lista',
      GIFT_ERROR_CODES.GIFT_SELF_RESERVATION,
    ),
  );
}

export function giftAlreadyReserved(): ConflictException {
  return new ConflictException(
    body(409, 'Conflict', 'Este presente já foi reservado', GIFT_ERROR_CODES.GIFT_ALREADY_RESERVED),
  );
}
