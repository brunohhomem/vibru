import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskRecurrenceKind, Task, TasksResponse } from '@vibru/shared';
import { api } from '@/lib/api';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export type TaskPayload = {
  title: string;
  notes: string | null;
  assigneeMemberId: string | null;
  dueOn: string | null;
  recurrence: { kind: TaskRecurrenceKind; interval: number };
};

export type CompleteTaskResult = {
  completed: Task;
  next: Task | null;
};

export type CompleteTaskVariables = {
  id: string;
  completedByMemberId: string;
};

export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<TasksResponse>('/tasks');
      return response.data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskPayload) => {
      const response = await api.post<Task>('/tasks', payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TaskPayload }) => {
      const response = await api.patch<Task>(`/tasks/${id}`, payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Task>(`/tasks/${id}/reopen`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: CompleteTaskVariables) => {
      const response = await api.post<CompleteTaskResult>(`/tasks/${id}/complete`);
      return response.data;
    },
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}
