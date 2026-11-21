'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Skeleton } from './skeleton';

const ROW_PLACEHOLDERS = [0, 1, 2, 3];

type LoadingStateProps = {
  label?: string;
  /** `rows` imita uma lista (bolinha e duas linhas), para telas que são listas. */
  variant?: 'blocks' | 'rows';
};

export function LoadingState({ label = 'Carregando…', variant = 'blocks' }: LoadingStateProps) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-40" />
      {variant === 'rows' ? (
        <div className="flex flex-col gap-3 rounded-xl bg-card p-3">
          {ROW_PLACEHOLDERS.map((placeholder) => (
            <div key={placeholder} className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </>
      )}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  /** Elemento do lucide já pronto, ex.: <Gift className="size-6" aria-hidden />. */
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
      {icon ? (
        <span className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="text-base font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry?: () => void;
};

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-border px-4 py-8">
      <h1 className="text-base font-medium">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

export function StatusPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="safe-bottom flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="flex w-full flex-col gap-3 md:w-[28rem]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </main>
  );
}
