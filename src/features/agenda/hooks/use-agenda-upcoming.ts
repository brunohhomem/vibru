import { useQuery } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { getAgendaUpcomingAction } from '../actions';
import { AGENDA_QUERY_KEY } from './use-agenda';

/** Fica sob a chave da Agenda: criar, editar ou planejar algo já atualiza a home. */
export function useAgendaUpcoming() {
  return useQuery({
    queryKey: [...AGENDA_QUERY_KEY, 'upcoming'],
    queryFn: async () => unwrapActionResult(await getAgendaUpcomingAction(undefined)),
  });
}
