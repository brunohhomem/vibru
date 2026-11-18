import { EmergencyScreen } from '@/features/health/components/emergency-screen.client';

export const metadata = { title: 'Emergência' };

type EmergencyPageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function EmergencyPage({ params }: EmergencyPageProps) {
  const { memberId } = await params;
  return <EmergencyScreen memberId={memberId} />;
}
