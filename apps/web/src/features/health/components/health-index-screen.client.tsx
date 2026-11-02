'use client';

import type { CoupleMember } from '@vibru/shared';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';
import { useHealthMembers } from '../hooks/use-health';

function medicationCountLabel(count: number): string {
  if (count === 0) return 'Nenhum remédio';
  return count === 1 ? '1 remédio' : `${count} remédios`;
}

type MemberCardProps = {
  memberId: string;
  name: string;
  medicationCount: number;
  member: CoupleMember | undefined;
};

function MemberCard({ memberId, name, medicationCount, member }: MemberCardProps) {
  const classes = member ? memberColorClasses(member.color) : null;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Link
        href={`/app/health/${memberId}`}
        className="flex min-h-11 items-center justify-between gap-3"
      >
        <span className="flex items-center gap-3">
          <span
            className={cn('size-3 rounded-full', classes ? classes.strong : 'bg-primary')}
            aria-hidden
          />
          <span className="flex flex-col">
            <span className="text-lg font-medium">{name}</span>
            <span className="text-sm text-muted-foreground">
              {medicationCountLabel(medicationCount)}
            </span>
          </span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export function HealthIndexScreen() {
  const members = useHealthMembers();
  const couple = useCouple();

  if (members.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (members.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar a saúde"
        description="Tente de novo."
        onRetry={() => void members.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saúde" description="A ficha de cada um e os remédios do dia a dia." />
      <ul className="flex flex-col gap-3">
        {members.data.members.map((item) => (
          <MemberCard
            key={item.memberId}
            memberId={item.memberId}
            name={item.name}
            medicationCount={item.medicationCount}
            member={couple.data?.members.find((member) => member.id === item.memberId)}
          />
        ))}
      </ul>
    </div>
  );
}
