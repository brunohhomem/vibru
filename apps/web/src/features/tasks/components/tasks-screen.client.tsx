'use client';

import type { CoupleMember, Task, TaskCategory, TaskGroups, TaskLowStock } from '@vibru/shared';
import { TASK_CATEGORIES, groupTasks } from '@vibru/shared';
import { Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { FilterChip } from './filter-chip';
import { LowStockDialog } from './low-stock-dialog.client';
import { CATEGORY_ALL, TaskCategoryFilters } from './task-category-filters';
import { TaskFormSheet } from './task-form-sheet.client';
import { TaskNotesSheet } from './task-notes-sheet.client';
import { CompletedTaskItem, TaskItem } from './task-item';
import { useCompleteTask, useReopenTask, useTasks } from '../hooks/use-tasks';
import { applyApiError } from '@/lib/api-error';

const FILTER_NONE = 'nos';
const FILTER_ALL = 'all';

const GROUP_ORDER: { key: keyof TaskGroups<Task>; label: string }[] = [
  { key: 'overdue', label: 'Atrasadas' },
  { key: 'today', label: 'Hoje' },
  { key: 'thisWeek', label: 'Esta semana' },
  { key: 'later', label: 'Mais pra frente' },
  { key: 'noDueDate', label: 'Sem prazo' },
];

function Summary({ openCount, completedCount }: { openCount: number; completedCount: number }) {
  return (
    <section aria-label="Resumo de tarefas" className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-card p-4">
        <p className="font-display text-2xl font-semibold">{openCount}</p>
        <p className="text-sm text-muted-foreground">{openCount === 1 ? 'aberta' : 'abertas'}</p>
      </div>
      <div className="rounded-xl bg-card p-4">
        <p className="font-display text-2xl font-semibold">{completedCount}</p>
        <p className="text-sm text-muted-foreground">feitas esta semana</p>
      </div>
    </section>
  );
}

function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-20 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

type TaskFilters = {
  assignee: string;
  category: TaskCategory | typeof CATEGORY_ALL;
  showMedications: boolean;
};

function matchesFilter(task: Task, filters: TaskFilters): boolean {
  if (task.medicationId !== null && !filters.showMedications) return false;
  if (filters.category !== CATEGORY_ALL && task.category !== filters.category) return false;
  if (filters.assignee === FILTER_ALL) return true;
  if (filters.assignee === FILTER_NONE) return task.assigneeMemberId === null;
  return task.assigneeMemberId === filters.assignee;
}

function resolveCategory(param: string | null): TaskFilters['category'] {
  const category = TASK_CATEGORIES.find((item) => item === param);
  return category ?? CATEGORY_ALL;
}

function resolveFilter(param: string | null, members: CoupleMember[]): string {
  if (param === FILTER_NONE) return FILTER_NONE;
  if (param && members.some((member) => member.id === param)) return param;
  return FILTER_ALL;
}

export function TasksScreen() {
  const couple = useCouple();
  const tasks = useTasks();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notesTask, setNotesTask] = useState<Task | null>(null);
  const [lowStock, setLowStock] = useState<TaskLowStock | null>(null);

  if (tasks.isPending || couple.isPending) return <TasksSkeleton />;

  if (tasks.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as tarefas"
        description="Tente de novo."
        onRetry={() => void tasks.refetch()}
      />
    );
  }

  const members = couple.data?.members ?? [];
  const data = tasks.data;
  const me = members.find((member) => member.isMe);
  const filter = resolveFilter(searchParams.get('de'), members);
  const filters: TaskFilters = {
    assignee: filter,
    category: resolveCategory(searchParams.get('cat')),
    showMedications: searchParams.get('remedios') === '1',
  };
  const openTasks = data.open.filter((task) => matchesFilter(task, filters));
  const completedTasks = data.completedThisWeek.filter((task) => matchesFilter(task, filters));
  const groups = groupTasks(openTasks, data.today);

  function updateSearchParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setFilter(nextFilter: string) {
    updateSearchParam('de', nextFilter === FILTER_ALL ? null : nextFilter);
  }

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    if (task.medicationId !== null) {
      setNotesTask(task);
      return;
    }

    setEditingTask(task);
    setFormOpen(true);
  }

  function handleComplete(task: Task) {
    if (!me) return;

    completeTask.mutate(
      { id: task.id, completedByMemberId: me.id },
      {
        onSuccess: (result) => {
          if (result.lowStock) setLowStock(result.lowStock);
          const message =
            task.assigneeMemberId === null ? `Concluída por ${me.displayName}` : 'Concluída';
          toast.success(message, {
            action: {
              label: 'Desfazer',
              onClick: () =>
                reopenTask.mutate(task.id, { onError: (error) => applyApiError(error) }),
            },
          });
        },
        onError: (error) => applyApiError(error),
      },
    );
  }

  function handleReopen(task: Task) {
    reopenTask.mutate(task.id, {
      onSuccess: () => toast.success('Tarefa reaberta'),
      onError: (error) => applyApiError(error),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader title="Tarefas" description="O que precisa ser feito na casa de vocês." />

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === FILTER_ALL} onClick={() => setFilter(FILTER_ALL)}>
          Todas
        </FilterChip>
        {members.map((member) => (
          <FilterChip
            key={member.id}
            active={filter === member.id}
            color={member.color}
            onClick={() => setFilter(member.id)}
          >
            {member.displayName}
          </FilterChip>
        ))}
        <FilterChip active={filter === FILTER_NONE} onClick={() => setFilter(FILTER_NONE)}>
          Nós
        </FilterChip>
      </div>

      <TaskCategoryFilters
        category={filters.category}
        showMedications={filters.showMedications}
        onCategoryChange={(category) =>
          updateSearchParam('cat', category === CATEGORY_ALL ? null : category)
        }
        onShowMedicationsChange={(show) => updateSearchParam('remedios', show ? '1' : null)}
      />

      <Summary openCount={openTasks.length} completedCount={completedTasks.length} />

      {openTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-base font-medium">Nenhuma tarefa aberta</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie a primeira no botão Nova tarefa.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {GROUP_ORDER.map((group) => {
            const items = groups[group.key];
            if (items.length === 0) return null;

            return (
              <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  {group.label}
                  <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
                </h2>
                <ul className="divide-y divide-border rounded-xl bg-card">
                  {items.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      members={members}
                      today={data.today}
                      onOpen={() => openEdit(task)}
                      onComplete={() => handleComplete(task)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {completedTasks.length > 0 ? (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span>Feitas esta semana</span>
            <span className="text-muted-foreground">{completedTasks.length}</span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {completedTasks.map((task) => (
              <CompletedTaskItem
                key={task.id}
                task={task}
                members={members}
                pending={reopenTask.isPending}
                onReopen={() => handleReopen(task)}
              />
            ))}
          </ul>
        </details>
      ) : null}

      <Button
        type="button"
        onClick={openCreate}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40 h-12 rounded-full px-5 shadow-lg md:right-8 md:bottom-8"
      >
        <Plus className="size-5" aria-hidden />
        Nova tarefa
      </Button>

      <TaskFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        members={members}
        today={data.today}
      />

      <TaskNotesSheet
        task={notesTask}
        onOpenChange={(open) => (open ? undefined : setNotesTask(null))}
      />

      <LowStockDialog lowStock={lowStock} onClose={() => setLowStock(null)} />
    </div>
  );
}
