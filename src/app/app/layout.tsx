import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell.client';
import { readSession } from '@/lib/session';

type LoggedInLayoutProps = {
  children: ReactNode;
};

// O proxy só olha o cookie; esta é a checagem real da sessão.
export default async function LoggedInLayout({ children }: LoggedInLayoutProps) {
  const session = await readSession();
  if (!session) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
