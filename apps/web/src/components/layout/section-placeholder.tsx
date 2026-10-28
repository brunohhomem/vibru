import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/screen-state';

type SectionPlaceholderProps = {
  title: string;
};

export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <div className="flex w-full flex-col gap-6 md:max-w-2xl">
      <PageHeader title={title} />
      <EmptyState
        title="Chega numa próxima fase"
        description="Esta seção entra nas próximas fases do Vibru."
      />
    </div>
  );
}
