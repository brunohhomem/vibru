'use client';

import type { CoupleMember, List, ListItem } from '@vibru/shared';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { applyApiError } from '@/lib/api-error';
import {
  useCheckListItem,
  useClearCheckedItems,
  useDeleteList,
  useList,
  useUncheckListItem,
} from '../hooks/use-lists';
import { ListAddItemForm } from './list-add-item-form.client';
import { ListItemRow } from './list-item-row';
import { ListItemSheet } from './list-item-sheet.client';
import { ListProgress } from './list-progress';
import { ListTitleSheet } from './list-title-sheet.client';

function ListDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
};

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ListHeaderProps = {
  list: List;
  onRename: () => void;
  onDelete: () => void;
};

function ListHeader({ list, onRename, onDelete }: ListHeaderProps) {
  const checkedCount = list.items.filter((item) => item.checkedAt !== null).length;

  return (
    <header className="flex flex-col gap-3">
      <Link
        href="/app/lists"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Listas
      </Link>
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{list.title}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Ações da lista">
              <MoreVertical className="size-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRename}>Renomear</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {checkedCount} de {list.items.length} marcados
        </p>
        <ListProgress total={list.items.length} checked={checkedCount} />
      </div>
    </header>
  );
}

type CheckedSectionProps = {
  items: ListItem[];
  renderItem: (item: ListItem) => React.ReactNode;
  onClear: () => void;
};

function CheckedSection({ items, renderItem, onClear }: CheckedSectionProps) {
  if (items.length === 0) return null;

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>Marcados ({items.length})</span>
      </summary>
      <ul className="divide-y divide-border border-t border-border">{items.map(renderItem)}</ul>
      <div className="border-t border-border p-2">
        <Button type="button" variant="outline" className="w-full" onClick={onClear}>
          Limpar marcados
        </Button>
      </div>
    </details>
  );
}

export function ListDetailScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const list = useList(listId);
  const couple = useCouple();
  const checkItem = useCheckListItem();
  const uncheckItem = useUncheckListItem();
  const deleteList = useDeleteList();
  const clearChecked = useClearCheckedItems();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);

  if (list.isPending || couple.isPending) return <ListDetailSkeleton />;

  if (list.isError || couple.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar a lista"
        description="Ela pode ter sido excluída. Tente de novo."
        onRetry={() => {
          void list.refetch();
          void couple.refetch();
        }}
      />
    );
  }

  const members: CoupleMember[] = couple.data.members;
  const me = members.find((member) => member.isMe);
  if (!me) return null;

  const openItems = list.data.items.filter((item) => item.checkedAt === null);
  const checkedItems = list.data.items.filter((item) => item.checkedAt !== null);

  function toggle(item: ListItem) {
    const variables = { listId, itemId: item.id, memberId: me?.id ?? '' };

    if (item.checkedAt !== null) {
      uncheckItem.mutate(variables, { onError: (error) => applyApiError(error) });
      return;
    }

    checkItem.mutate(variables, {
      onSuccess: () =>
        toast.success('Marcado', {
          action: {
            label: 'Desfazer',
            onClick: () =>
              uncheckItem.mutate(variables, { onError: (error) => applyApiError(error) }),
          },
        }),
      onError: (error) => applyApiError(error),
    });
  }

  function confirmDeleteList() {
    deleteList.mutate(listId, {
      onSuccess: () => {
        toast.success('Lista excluída');
        router.push('/app/lists');
      },
      onError: (error) => applyApiError(error),
    });
  }

  function confirmClearChecked() {
    clearChecked.mutate(listId, {
      onSuccess: () => {
        setClearOpen(false);
        toast.success('Marcados removidos');
      },
      onError: (error) => applyApiError(error),
    });
  }

  function renderItem(item: ListItem) {
    return (
      <ListItemRow
        key={item.id}
        item={item}
        members={members}
        me={me as CoupleMember}
        onToggle={() => toggle(item)}
        onOpen={() => setEditingItem(item)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <ListHeader
        list={list.data}
        onRename={() => setRenameOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <ListAddItemForm listId={listId} />

      {list.data.items.length === 0 ? (
        <EmptyState title="Lista vazia" description="Adicione o primeiro item acima" />
      ) : null}

      {openItems.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl bg-card">{openItems.map(renderItem)}</ul>
      ) : null}

      <CheckedSection
        items={checkedItems}
        renderItem={renderItem}
        onClear={() => setClearOpen(true)}
      />

      <ListTitleSheet
        open={renameOpen}
        onOpenChange={setRenameOpen}
        list={{ id: list.data.id, title: list.data.title }}
      />

      <ListItemSheet
        listId={listId}
        item={editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir lista?"
        description={`"${list.data.title}" e seus itens somem para vocês dois.`}
        confirmLabel={deleteList.isPending ? 'Excluindo…' : 'Excluir'}
        pending={deleteList.isPending}
        onConfirm={confirmDeleteList}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Limpar marcados?"
        description="Os itens marcados somem da lista para vocês dois."
        confirmLabel={clearChecked.isPending ? 'Limpando…' : 'Limpar'}
        pending={clearChecked.isPending}
        onConfirm={confirmClearChecked}
      />
    </div>
  );
}
