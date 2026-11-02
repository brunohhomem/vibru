import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PharmacyResult } from '@vibru/shared';
import { LISTS_QUERY_KEY } from '@/features/lists/hooks/use-lists';
import { api } from '@/lib/api';

export function useAddToPharmacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      const response = await api.post<PharmacyResult>(
        `/health/medications/${medicationId}/pharmacy`,
      );
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY }),
  });
}
