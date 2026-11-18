import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ActionResultError } from './unwrap-action-result';

const GENERIC_FAILURE_MESSAGE = 'Não foi possível concluir a ação';

/**
 * Mostra ao usuário a falha de uma mutation. Falha de server action já traz a mensagem
 * pronta e, se apontar um campo do formulário, a mensagem vai para ele. Qualquer outro erro
 * (rede, bug) vira a mensagem genérica, sem expor detalhe interno.
 */
export function applyActionError<T extends FieldValues>(
  error: unknown,
  setError?: UseFormSetError<T>,
): void {
  if (!(error instanceof ActionResultError)) {
    toast.error(GENERIC_FAILURE_MESSAGE);
    return;
  }

  if (error.field && setError) {
    setError(error.field as Path<T>, { message: error.message });
    return;
  }
  toast.error(error.message);
}
