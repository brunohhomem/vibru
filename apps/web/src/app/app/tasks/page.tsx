import { Suspense } from 'react';
import { LoadingState } from '@/components/ui/screen-state';
import { TasksScreen } from '@/features/tasks/components/tasks-screen.client';

export const metadata = { title: 'Tarefas' };

export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TasksScreen />
    </Suspense>
  );
}
