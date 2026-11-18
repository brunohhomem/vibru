import type { ActionFailureCode, ActionResult } from './define-action';

// Erro do lado do cliente: o TanStack Query espera exceção para marcar a query ou a mutation como falha.
export class ActionResultError extends Error {
  constructor(
    readonly code: ActionFailureCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export function unwrapActionResult<TData>(result: ActionResult<TData>): TData {
  if (result.ok) return result.data;
  throw new ActionResultError(result.code, result.message, result.field);
}

export type LoadFailureKind = 'couple-required' | 'redirect-to-login' | 'retry';

// Decide, no shell do /app, o que fazer com a falha ao carregar a sessão ou o casal.
export function describeActionFailure(error: unknown): LoadFailureKind {
  if (!(error instanceof ActionResultError)) return 'retry';
  if (error.code === 'couple_required') return 'couple-required';
  if (error.code === 'unauthenticated') return 'redirect-to-login';
  return 'retry';
}
