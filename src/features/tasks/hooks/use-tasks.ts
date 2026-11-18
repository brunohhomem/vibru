import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HEALTH_QUERY_KEY } from '@/features/health/lib/query-keys';
import type { TaskCategory } from '@/features/tasks/categories';
import type { TaskRecurrenceKind } from '@/features/tasks/recurrence';
import type { TasksResponse } from '@/features/tasks/task-schemas';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  completeTaskAction,
  createTaskAction,
  listTasksAction,
  removeTaskAction,
  reopenTaskAction,
  updateTaskAction,
} from '../actions';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export type TaskPayload = {
  title: string;
  notes: string | null;
  assigneeMemberId: string | null;
  dueOn: string | null;
  dueTime: string | null;
  category: TaskCategory;
  recurrence: { kind: TaskRecurrenceKind; interval: number };
};

/** Tarefa de remédio só aceita observações; o resto muda pelo remédio. */
export type TaskUpdatePayload = Partial<TaskPayload>;

export type CompleteTaskVariables = {
  id: string;
  completedByMemberId: string;
};

export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await listTasksAction(undefined)),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskPayload) => unwrapActionResult(await createTaskAction(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TaskUpdatePayload }) =>
      unwrapActionResult(await updateTaskAction({ id, patch: payload })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      unwrapActionResult(await removeTaskAction({ id }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => unwrapActionResult(await reopenTaskAction({ id })),
    onSuccess: () => {
      // Reabrir tarefa de remédio devolve estoque.
      void queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
      return queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: CompleteTaskVariables) =>
      unwrapActionResult(await completeTaskAction({ id })),
    onMutate: async ({ id, completedByMemberId }: CompleteTaskVariables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = queryClient.getQueryData<TasksResponse>(TASKS_QUERY_KEY);

      if (previous) {
        const task = previous.open.find((item) => item.id === id);
        if (task) {
          queryClient.setQueryData<TasksResponse>(TASKS_QUERY_KEY, {
            ...previous,
            open: previous.open.filter((item) => item.id !== id),
            completedThisWeek: [
              ...previous.completedThisWeek,
              {
                ...task,
                completedAt: new Date().toISOString(),
                completedByMemberId,
              },
            ],
          });
        }
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previous) return;
      queryClient.setQueryData(TASKS_QUERY_KEY, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
      return queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}
