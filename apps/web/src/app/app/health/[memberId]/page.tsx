import { HealthRecordScreen } from '@/features/health/components/health-record-screen.client';

export const metadata = { title: 'Ficha de saúde' };

type HealthRecordPageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function HealthRecordPage({ params }: HealthRecordPageProps) {
  const { memberId } = await params;
  return <HealthRecordScreen memberId={memberId} />;
}
