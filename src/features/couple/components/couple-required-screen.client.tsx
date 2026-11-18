'use client';

import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/ui/screen-state';

type CoupleRequiredScreenProps = {
  onLogout: () => void;
};

export function CoupleRequiredScreen({ onLogout }: CoupleRequiredScreenProps) {
  return (
    <StatusPage
      title="Sua conta não está ligada a um casal"
      description="Peça a quem administra o Vibru para ligar a sua conta ao casal."
    >
      <Button type="button" variant="outline" onClick={onLogout}>
        Sair
      </Button>
    </StatusPage>
  );
}
