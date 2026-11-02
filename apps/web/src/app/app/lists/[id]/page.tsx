import { ListDetailScreen } from '@/features/lists/components/list-detail-screen.client';

export const metadata = { title: 'Lista' };

type ListDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;
  return <ListDetailScreen listId={id} />;
}
