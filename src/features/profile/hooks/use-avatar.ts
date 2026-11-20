import { useMutation } from '@tanstack/react-query';
import { COUPLE_QUERY_KEY } from '@/features/couple/hooks/use-couple';
import { queryClient } from '@/lib/query-client';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { removeAvatarAction, updateAvatarAction } from '../actions';
import { resizeAvatarImage } from '../lib/resize-avatar-image';

// A foto vem na resposta do casal; recarregar essa query atualiza todas as telas.
async function refreshCouple(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: COUPLE_QUERY_KEY });
}

export function useChangeAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const image = await resizeAvatarImage(file);
      unwrapActionResult(await updateAvatarAction({ image }));
    },
    onSuccess: refreshCouple,
  });
}

export function useRemoveAvatar() {
  return useMutation({
    mutationFn: async () => unwrapActionResult(await removeAvatarAction(undefined)),
    onSuccess: refreshCouple,
  });
}
