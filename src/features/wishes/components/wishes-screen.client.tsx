'use client';

import { WISH_CATEGORIES, type WishCategory } from '@vibru/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { GiftsTab } from '@/features/gifts/components/gifts-tab.client';
import { FilterChip } from '@/features/tasks/components/filter-chip';
import { WishesTab } from './wishes-tab.client';

type Tab = 'desejos' | 'presentes';

function resolveCategory(value: string | null): WishCategory | null {
  return WISH_CATEGORIES.find((category) => category === value) ?? null;
}

/** Presentes é uma aba interna de Desejos: 6 abas não cabem em 390px (ADR 0003, 6.4). */
export function WishesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('aba') === 'presentes' ? 'presentes' : 'desejos';
  const category = resolveCategory(searchParams.get('categoria'));

  function updateQuery(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-8 md:max-w-3xl">
      <PageHeader title="Desejos" />
      <div role="group" aria-label="Seção" className="grid grid-cols-2 gap-2">
        <FilterChip active={tab === 'desejos'} onClick={() => updateQuery({ aba: null })}>
          Desejos
        </FilterChip>
        <FilterChip
          active={tab === 'presentes'}
          onClick={() => updateQuery({ aba: 'presentes', categoria: null })}
        >
          Presentes
        </FilterChip>
      </div>

      {tab === 'desejos' ? (
        <WishesTab
          category={category}
          onCategoryChange={(next) => updateQuery({ categoria: next })}
        />
      ) : (
        <GiftsTab />
      )}
    </div>
  );
}
