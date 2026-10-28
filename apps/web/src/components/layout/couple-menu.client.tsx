'use client';

import { Check, Palette, Settings, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import type { CoupleMember } from '@vibru/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
] as const;

const MENU_ICON_CLASSES = 'size-4 shrink-0';

function memberInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase();
}

function MemberAvatar({ member }: { member: CoupleMember }) {
  const classes = memberColorClasses(member.color);

  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 items-center justify-center rounded-full text-sm font-semibold ring-2 ring-background',
        classes.tile,
        classes.onTile,
      )}
    >
      {memberInitial(member.displayName)}
    </span>
  );
}

type CoupleMenuProps = {
  members: CoupleMember[];
  isAdmin: boolean;
  onLogout: () => void;
};

export function CoupleMenu({ members, isAdmin, onLogout }: CoupleMenuProps) {
  const { theme, setTheme } = useTheme();
  const coupleNames = members.map((member) => member.displayName).join(' e ');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do casal"
          className="flex items-center -space-x-2 rounded-full p-1 hover:bg-accent"
        >
          {members.map((member) => (
            <MemberAvatar key={member.id} member={member} />
          ))}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>{coupleNames}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/couple">
            <Settings className={MENU_ICON_CLASSES} aria-hidden />
            Configurações do casal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/profile">
            <User className={MENU_ICON_CLASSES} aria-hidden />
            Perfil
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/app/users">
                <Users className={MENU_ICON_CLASSES} aria-hidden />
                Usuários
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <Settings className={MENU_ICON_CLASSES} aria-hidden />
                Configurações
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className={MENU_ICON_CLASSES} aria-hidden />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEME_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => setTheme(option.value)}>
                <Check
                  className={cn(
                    MENU_ICON_CLASSES,
                    theme === option.value ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
