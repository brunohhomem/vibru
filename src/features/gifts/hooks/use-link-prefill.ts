import { useCallback, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { previewLinkAction } from '@/features/link-preview/actions';
import { formatCents } from '@/lib/money';
import type { GiftFormValues } from '../schemas/forms';

/**
 * Ao sair do campo de link, busca título e preço da página e preenche só o que
 * a pessoa ainda não digitou. Falha na busca não atrapalha: o formulário segue manual.
 */
export function useLinkPrefill(form: UseFormReturn<GiftFormValues>) {
  const lastLookedUp = useRef<string>('');

  return useCallback(() => {
    const url = form.getValues('url').trim();
    if (!url || url === lastLookedUp.current) return;
    lastLookedUp.current = url;

    void previewLinkAction({ url }).then((result) => {
      if (!result.ok) return;

      const { title, priceCents } = result.data;
      if (title && !form.getValues('title').trim()) form.setValue('title', title);
      if (priceCents !== null && !form.getValues('price').trim()) {
        form.setValue('price', formatCents(priceCents).replace(/^R\$\s/, ''));
      }
    });
  }, [form]);
}
