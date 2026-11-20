import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { getPreferencesAction, updatePreferencesAction } from '../actions';
import type { NotificationPreferences, UpdatePreferencesInput } from '../push-preferences';

const PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await getPreferencesAction(undefined)),
    retry: false,
  });
}

/** O interruptor muda na hora e volta ao estado anterior se o servidor recusar. */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: UpdatePreferencesInput) =>
      unwrapActionResult(await updatePreferencesAction(patch)),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreferences>(PREFERENCES_QUERY_KEY);
      queryClient.setQueryData<NotificationPreferences>(PREFERENCES_QUERY_KEY, (current) =>
        current ? { ...current, ...patch } : current,
      );
      return { previous };
    },
    onError: (_error, _patch, context) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, context?.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
    },
  });
}
