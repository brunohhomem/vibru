'use client';

import { WISH_CATEGORIES, type Wish, type WishCategory } from '@vibru/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { FilterChip } from '@/features/tasks/components/filter-chip';
import { applyApiError } from '@/lib/api-error';
import { useSetWishDone, useWishes } from '../hooks/use-wishes';
import { wishCategoryLabel } from '../lib/wish-format';
import { PlanWishSheet } from './plan-wish-sheet.client';
import { WishCard } from './wish-card';
import { WishSheet } from './wish-sheet.client';

type WishesTabProps = {
  category: WishCategory | null;
  onCategoryChange: (category: WishCategory | null) => void;
};

type WishListProps = {
  wishes: Wish[];
  onEdit: (wish: Wish) => void;
  onPlan: (wish: Wish) => void;
  onToggleDone: (wish: Wish) => void;
};

function WishList({ wishes, onEdit, onPlan, onToggleDone }: WishListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {wishes.map((wish) => (
        <WishCard
          key={wish.id}
          wish={wish}
          onEdit={() => onEdit(wish)}
          onPlan={() => onPlan(wish)}
          onToggleDone={() => onToggleDone(wish)}
        />
      ))}
    </div>
  );
}

export function WishesTab({ category, onCategoryChange }: WishesTabProps) {
  const open = useWishes({ status: 'open' });
  const done = useWishes({ status: 'done' });
  const setDone = useSetWishDone();
  const [editing, setEditing] = useState<{ wish: Wish | null } | null>(null);
  const [planning, setPlanning] = useState<Wish | null>(null);

  function toggleDone(wish: Wish) {
    const markDone = wish.doneAt === null;
    setDone.mutate(
      { wishId: wish.id, done: markDone },
      {
        onSuccess: () => toast.success(markDone ? 'Desejo feito' : 'Desejo de volta à lista'),
        onError: (error) => applyApiError(error),
      },
    );
  }

  const inCategory = (wishes: Wish[]) =>
    category ? wishes.filter((wish) => wish.category === category) : wishes;
  const openWishes = inCategory(open.data?.wishes ?? []);
  const doneWishes = inCategory(done.data?.wishes ?? []);
  const listProps = {
    onEdit: (wish: Wish) => setEditing({ wish }),
    onPlan: setPlanning,
    onToggleDone: toggleDone,
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
        <FilterChip active={category === null} onClick={() => onCategoryChange(null)}>
          Todas
        </FilterChip>
        {WISH_CATEGORIES.map((item) => (
          <FilterChip key={item} active={category === item} onClick={() => onCategoryChange(item)}>
            {wishCategoryLabel(item)}
          </FilterChip>
        ))}
      </div>

      <Button type="button" onClick={() => setEditing({ wish: null })}>
        <Plus className="size-4" aria-hidden />
        Novo desejo
      </Button>

      {open.isPending ? <LoadingState /> : null}
      {open.isError ? (
        <ErrorState
          title="Não foi possível carregar os desejos"
          description="Tente de novo."
          onRetry={() => void open.refetch()}
        />
      ) : null}
      {open.isSuccess && openWishes.length === 0 ? (
        <EmptyState
          title="Nenhum desejo aqui"
          description="Anote o próximo filme, viagem ou rolê."
        />
      ) : null}
      <WishList wishes={openWishes} {...listProps} />

      {doneWishes.length > 0 ? (
        <section aria-label="Feitos" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Feitos</h2>
          <WishList wishes={doneWishes} {...listProps} />
        </section>
      ) : null}

      <WishSheet
        open={editing !== null}
        wish={editing?.wish ?? null}
        defaultCategory={category ?? 'other'}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditing(null);
        }}
      />
      <PlanWishSheet
        wish={planning}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPlanning(null);
        }}
      />
    </div>
  );
}
