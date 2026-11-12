import { Suspense } from 'react';
import { LoadingState } from '@/components/ui/screen-state';
import { WishesScreen } from '@/features/wishes/components/wishes-screen.client';

export const metadata = { title: 'Desejos' };

export default function WishesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <WishesScreen />
    </Suspense>
  );
}
