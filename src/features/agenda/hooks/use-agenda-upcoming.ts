import { useQuery } from '@tanstack/react-query';
import type { AgendaUpcomingResponse } from '@vibru/shared';
import { api } from '@/lib/api';
import { AGENDA_QUERY_KEY } from './use-agenda';

/** Fica sob a chave da Agenda: criar, editar ou planejar algo já atualiza a home. */
export function useAgendaUpcoming() {
  return useQuery({
    queryKey: [...AGENDA_QUERY_KEY, 'upcoming'],
    queryFn: async () => {
      const response = await api.get<AgendaUpcomingResponse>('/agenda/upcoming');
      return response.data;
    },
  });
}
