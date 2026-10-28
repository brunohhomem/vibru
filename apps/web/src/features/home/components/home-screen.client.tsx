'use client';

import Link from 'next/link';
import type { CoupleMember, CoupleResponse } from '@vibru/shared';
import { ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { useCouple } from '@/features/couple/hooks/use-couple';
import {
  countLabel,
  daysUntilLabel,
  formatLongDate,
  formatSinceDate,
  yearsLabel,
} from '@/features/home/lib/home-format';
import { cn } from '@/lib/cn';

type WeddingAnniversary = NonNullable<CoupleResponse['nextWeddingAnniversary']>;
type DatingAnniversary = NonNullable<CoupleResponse['nextDatingAnniversary']>;

function MarriedTile({ couple }: { couple: CoupleResponse }) {
  if (!couple.married || !couple.marriedOn) {
    return (
      <Link
        href="/app/couple"
        className="col-span-2 row-span-2 flex flex-col justify-between gap-4 rounded-xl border border-dashed border-border bg-card p-5"
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Casados há
        </p>
        <p className="font-display text-2xl font-semibold">Defina as datas do casal</p>
        <p className="text-sm text-muted-foreground">
          Início do namoro e casamento viram os contadores da casa.
        </p>
        <span className="text-sm font-medium text-primary">Abrir configurações →</span>
      </Link>
    );
  }

  const { totalDays, years, months, days } = couple.married;

  return (
    <section className="col-span-2 row-span-2 flex flex-col justify-between gap-6 rounded-xl bg-primary p-5 text-primary-foreground">
      <p className="text-xs font-medium tracking-wide uppercase opacity-80">Casados há</p>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-6xl leading-none font-semibold">{totalDays}</span>
        <span className="text-sm font-medium">dias</span>
      </p>
      <p className="text-sm opacity-90">
        {countLabel(years, 'ano', 'anos')}, {countLabel(months, 'mês', 'meses')} e{' '}
        {countLabel(days, 'dia', 'dias')} · desde {formatSinceDate(couple.marriedOn)}
      </p>
    </section>
  );
}

function MemberTile({ member }: { member: CoupleMember }) {
  const classes = memberColorClasses(member.color);

  return (
    <section
      className={cn(
        'flex flex-col justify-between gap-3 rounded-xl p-4',
        classes.tile,
        classes.onTile,
      )}
    >
      <span className={cn('size-2.5 rounded-full', classes.strong)} aria-hidden />
      <p className="text-lg font-medium break-words">{member.displayName}</p>
    </section>
  );
}

function WeddingTile({ anniversary }: { anniversary: WeddingAnniversary }) {
  return (
    <section className="flex flex-col justify-between gap-3 rounded-xl bg-sand p-4 text-sand-foreground">
      <p className="text-xs font-medium tracking-wide uppercase opacity-80">Próximas bodas</p>
      <div>
        <p className="font-display text-lg font-semibold">
          {anniversary.bodasName ?? 'Bodas de casamento'}
        </p>
        <p className="text-sm">
          {yearsLabel(anniversary.years)} · {daysUntilLabel(anniversary.daysUntil)}
        </p>
      </div>
    </section>
  );
}

function DatingTile({ anniversary }: { anniversary: DatingAnniversary }) {
  return (
    <section className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Aniversário de namoro
      </p>
      <div>
        <p className="font-display text-lg font-semibold">{yearsLabel(anniversary.years)}</p>
        <p className="text-sm text-muted-foreground">{daysUntilLabel(anniversary.daysUntil)}</p>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid auto-rows-[minmax(9rem,auto)] grid-cols-2 gap-2 lg:grid-cols-4">
        <Skeleton className="col-span-2 row-span-2 rounded-xl" />
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
      </div>
    </div>
  );
}

export function HomeScreen() {
  const couple = useCouple();

  if (couple.isPending) return <HomeSkeleton />;

  if (couple.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar a casa"
        description="Tente de novo."
        onRetry={() => void couple.refetch()}
      />
    );
  }

  const data = couple.data;
  const me = data.members.find((member) => member.isMe);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Oi, {me?.displayName ?? 'vocês'}
        </h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatLongDate(data.today)}
        </p>
      </header>
      <div className="grid auto-rows-[minmax(9rem,auto)] grid-cols-2 gap-2 lg:grid-cols-4">
        <MarriedTile couple={data} />
        {data.members.map((member) => (
          <MemberTile key={member.id} member={member} />
        ))}
        {data.nextWeddingAnniversary ? (
          <WeddingTile anniversary={data.nextWeddingAnniversary} />
        ) : null}
        {data.nextDatingAnniversary ? (
          <DatingTile anniversary={data.nextDatingAnniversary} />
        ) : null}
      </div>
    </div>
  );
}
