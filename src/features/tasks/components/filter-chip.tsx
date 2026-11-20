import { MemberAvatar } from '@/features/couple/components/member-avatar';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';
import type { CoupleMember, MemberColor } from '@/features/couple/couple-schemas';

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  color?: MemberColor;
  /** Quando é o filtro de uma pessoa, mostra a foto dela ao lado do nome. */
  member?: Pick<CoupleMember, 'displayName' | 'color' | 'avatarUrl'>;
  children: string;
};

export function FilterChip({ active, onClick, color, member, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 max-w-44 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card hover:bg-accent',
        !active && (color ? memberColorClasses(color).onTile : 'text-muted-foreground'),
      )}
    >
      {member ? <MemberAvatar member={member} size="small" className="ring-0" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}
