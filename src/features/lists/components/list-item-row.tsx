import type { CoupleMember, ListItem } from '@vibru/shared';
import { Check } from 'lucide-react';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';

type ListItemRowProps = {
  item: ListItem;
  members: CoupleMember[];
  /** Cor forte de quem está logado, usada no círculo de marcar. */
  me: CoupleMember;
  onToggle: () => void;
  onOpen: () => void;
};

export function ListItemRow({ item, members, me, onToggle, onOpen }: ListItemRowProps) {
  const isChecked = item.checkedAt !== null;
  const checker = members.find((member) => member.id === item.checkedByMemberId);
  const strongClasses = cn(memberColorClasses(me.color).strong, 'text-background');

  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <button
        type="button"
        aria-label={isChecked ? `Desmarcar ${item.title}` : `Marcar ${item.title}`}
        aria-pressed={isChecked}
        onClick={onToggle}
        className={cn(
          'mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-opacity hover:opacity-90',
          isChecked ? cn(strongClasses, 'border-transparent') : 'border-border bg-card',
        )}
      >
        {isChecked ? <Check className="size-5" aria-hidden /> : null}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 flex-1 flex-col items-start justify-center gap-0.5 rounded-md px-1 py-0.5 text-left"
      >
        <span
          className={cn(
            'text-base font-medium break-words',
            isChecked && 'text-muted-foreground line-through',
          )}
        >
          {item.title}
        </span>
        {isChecked ? (
          <span className="text-xs text-muted-foreground">
            marcado por {checker?.displayName ?? 'alguém'}
          </span>
        ) : null}
      </button>
    </li>
  );
}
