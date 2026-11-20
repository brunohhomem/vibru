'use client';

import { Check, Download, HeartPulse, Palette, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState } from 'react';
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
import { MemberAvatar } from '@/features/couple/components/member-avatar';
import { IosInstallDialog } from '@/features/install/components/ios-install-dialog.client';
import { useInstallApp } from '@/features/install/hooks/use-install-app';
import { cn } from '@/lib/cn';
import type { CoupleMember } from '@/features/couple/couple-schemas';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
] as const;

const MENU_ICON_CLASSES = 'size-4 shrink-0';

type CoupleMenuProps = {
  members: CoupleMember[];
  onLogout: () => void;
};

export function CoupleMenu({ members, onLogout }: CoupleMenuProps) {
  const { theme, setTheme } = useTheme();
  const coupleNames = members.map((member) => member.displayName).join(' e ');
  const { mode: installMode, promptInstall } = useInstallApp();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const canInstall = installMode === 'native-prompt' || installMode === 'ios-manual';

  function handleInstall() {
    if (installMode === 'ios-manual') {
      setIosDialogOpen(true);
      return;
    }
    void promptInstall();
  }

  return (
    <>
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
          <DropdownMenuItem asChild>
            <Link href="/app/health">
              <HeartPulse className={MENU_ICON_CLASSES} aria-hidden />
              Saúde
            </Link>
          </DropdownMenuItem>
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
          {canInstall ? (
            <DropdownMenuItem onSelect={handleInstall}>
              <Download className={MENU_ICON_CLASSES} aria-hidden />
              Instalar app
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout}>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </>
  );
}
