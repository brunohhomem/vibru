'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useLists } from '../hooks/use-lists';
import { ListProgress } from './list-progress';
import { ListTitleSheet } from './list-title-sheet.client';

function ListsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function ListsScreen() {
  const lists = useLists();
  const [createOpen, setCreateOpen] = useState(false);

  if (lists.isPending) return <ListsSkeleton />;

  if (lists.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as listas"
        description="Tente de novo."
        onRetry={() => void lists.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader title="Listas" description="Mercado, farmácia e o que mais couber." />

      {lists.data.lists.length === 0 ? (
        <EmptyState title="Nenhuma lista ainda" description="Crie a primeira no botão Nova lista" />
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.data.lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/app/lists/${list.id}`}
                className="flex min-h-11 flex-col gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium break-words">{list.title}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {list.checkedItems} de {list.totalItems}
                  </span>
                </span>
                <ListProgress total={list.totalItems} checked={list.checkedItems} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40 h-12 rounded-full px-5 shadow-lg md:right-8 md:bottom-8"
      >
        <Plus className="size-5" aria-hidden />
        Nova lista
      </Button>

      <ListTitleSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
