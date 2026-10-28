'use client';

import type { CoupleMember } from '@vibru/shared';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';
import { CoupleRequiredScreen } from '@/features/couple/components/couple-required-screen.client';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { BottomNav, SideNav } from './app-nav.client';
import { CoupleMenu } from './couple-menu.client';

function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function FullScreenError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <main className="safe-bottom mx-auto flex min-h-dvh w-full flex-col justify-center px-4 md:w-[28rem]">
      <ErrorState title={title} description="Tente de novo." onRetry={onRetry} />
    </main>
  );
}

type AppFrameProps = {
  children: ReactNode;
  members: CoupleMember[];
  isAdmin: boolean;
  onLogout: () => void;
};

function AppFrame({ children, members, isAdmin, onLogout }: AppFrameProps) {
  return (
    <div className="min-h-dvh bg-background">
      <SideNav />
      <div className="flex min-h-dvh flex-col md:pl-64">
        <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2 md:px-8">
            <Link
              href="/app"
              className="font-display text-xl font-semibold tracking-tight md:hidden"
            >
              Vibru
            </Link>
            <div className="ml-auto">
              <CoupleMenu members={members} isAdmin={isAdmin} onLogout={onLogout} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-32 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const couple = useCouple();
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    if (!me.data?.user.mustChangePassword) return;
    router.replace('/change-password');
  }, [me.data, router]);

  if (me.isPending || me.data?.user.mustChangePassword) return <LoadingState />;

  if (me.isError) {
    if (statusOf(me.error) === 401) return <LoadingState label="Redirecionando…" />;
    return (
      <FullScreenError
        title="Não foi possível carregar a sessão"
        onRetry={() => void me.refetch()}
      />
    );
  }

  if (couple.isPending) return <LoadingState />;

  if (couple.isError) {
    if (statusOf(couple.error) === 403)
      return <CoupleRequiredScreen onLogout={() => void logout()} />;
    return (
      <FullScreenError
        title="Não foi possível carregar o casal"
        onRetry={() => void couple.refetch()}
      />
    );
  }

  return (
    <AppFrame
      members={couple.data.members}
      isAdmin={me.data.user.role === 'admin'}
      onLogout={() => void logout()}
    >
      {children}
    </AppFrame>
  );
}
