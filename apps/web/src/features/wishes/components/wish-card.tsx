import type { Wish } from '@vibru/shared';
import { CalendarCheck, Check, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSinceDate } from '@/features/home/lib/home-format';
import { formatCents } from '@/lib/money';
import { wishCategoryLabel } from '../lib/wish-format';
import { WishCategoryIcon } from './wish-category-icon';

type WishCardProps = {
  wish: Wish;
  onEdit: () => void;
  onPlan: () => void;
  onToggleDone: () => void;
};

function WishCover({ wish }: { wish: Wish }) {
  if (wish.imageUrl) {
    return (
      // A imagem vem de outro site: sem Referer, a loja não sabe de onde veio a visita.
      <img
        src={wish.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="aspect-video w-full rounded-t-xl object-cover"
      />
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-t-xl bg-sand text-sand-foreground">
      <WishCategoryIcon category={wish.category} className="size-10" />
    </div>
  );
}

export function WishCard({ wish, onEdit, onPlan, onToggleDone }: WishCardProps) {
  const isDone = wish.doneAt !== null;
  const details = [
    wishCategoryLabel(wish.category),
    wish.priceCents != null ? formatCents(wish.priceCents) : null,
  ].filter(Boolean);

  return (
    <article
      aria-label={wish.title}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <WishCover wish={wish} />
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-base font-semibold break-words">{wish.title}</h3>
        <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
        {wish.plannedOn ? (
          <p className="text-sm font-medium text-primary">
            Planejado para {formatSinceDate(wish.plannedOn)}
          </p>
        ) : null}
        {wish.url ? (
          <a
            href={wish.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
          >
            Abrir link
          </a>
        ) : null}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 px-4 pb-4">
        <Button
          type="button"
          variant="outline"
          aria-label={`Editar ${wish.title}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={`Planejar ${wish.title}`}
          onClick={onPlan}
          disabled={isDone}
        >
          <CalendarCheck className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={isDone ? `Desfazer ${wish.title}` : `Marcar ${wish.title} como feito`}
          onClick={onToggleDone}
        >
          {isDone ? (
            <RotateCcw className="size-4" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
        </Button>
      </div>
    </article>
  );
}
