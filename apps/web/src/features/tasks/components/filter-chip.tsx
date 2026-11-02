import type { MemberColor } from '@vibru/shared';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  color?: MemberColor;
  children: string;
};

export function FilterChip({ active, onClick, color, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 max-w-40 items-center truncate rounded-full border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card hover:bg-accent',
        !active && (color ? memberColorClasses(color).onTile : 'text-muted-foreground'),
      )}
    >
      {children}
    </button>
  );
}
