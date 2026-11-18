import type { GiftResponse } from '@vibru/shared';
import { Gift } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCents } from '@/lib/money';
import { giftCategoryLabel } from '../lib/gift-format';

type GiftCardProps = {
  gift: GiftResponse;
  status?: ReactNode;
  actions: ReactNode;
};

/** Cartão neutro: quem decide reserva e ações é a aba, conforme a lista é sua ou da outra pessoa. */
export function GiftCard({ gift, status, actions }: GiftCardProps) {
  const details = [
    giftCategoryLabel(gift.category),
    gift.priceCents != null ? formatCents(gift.priceCents) : null,
  ].filter(Boolean);

  return (
    <article
      aria-label={gift.title}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      {gift.imageUrl ? (
        // A imagem vem de outro site: sem Referer, a loja não sabe de onde veio a visita.
        <img
          src={gift.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-sand text-sand-foreground">
          <Gift className="size-10" aria-hidden />
        </div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-base font-semibold break-words">{gift.title}</h3>
        <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
        {status}
        {gift.url ? (
          <a
            href={gift.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
          >
            Abrir link
          </a>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2 px-4 pb-4">{actions}</div>
    </article>
  );
}
